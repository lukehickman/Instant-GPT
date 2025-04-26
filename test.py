from pyspark.sql import SparkSession
import os
import openai
import asyncio
from aiolimiter import AsyncLimiter
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

# 1) configure your OpenAI API key
openai.api_key = dbutils.secrets.get("openai", "api_key")

# 2) rate‐limit to whatever your plan allows (e.g. 60 calls／min)
api_limiter = AsyncLimiter(max_rate=60, time_period=60)

# 3) wrap with retry/backoff to handle 429s & transient network issues
@retry(
    retry=retry_if_exception_type(openai.error.RateLimitError),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    stop=stop_after_attempt(5)
)
async def call_openai_async(prompt: str):
    async with api_limiter:
        resp = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

# 4) process one partition’s worth of rows concurrently
def partition_processor(rows):
    records = list(rows)
    prompts = [r["input_text"] for r in records]

    async def run_batch():
        sem = asyncio.Semaphore(20)                   # max 20 in flight
        async def sem_task(p):
            async with sem:
                return await call_openai_async(p)

        tasks = [asyncio.create_task(sem_task(p)) for p in prompts]
        results = []
        for coro in asyncio.as_completed(tasks):
            out = await coro
            results.append(out)
        return results

    # run the event loop
    outputs = asyncio.run(run_batch())

    # yield back one row per input
    for rec, out in zip(records, outputs):
        yield {
            **rec.asDict(),
            "openai_response": out
        }

# 5) hook it into Spark
spark = SparkSession.builder.getOrCreate()

df = spark.read.format("delta").load("/path/to/your/delta")\
    .select("id", "input_text")\
    .repartition(50)   # tune num partitions to cluster size

# mapPartitions does not shuffle your data, just fans out per executor
result_df = df.rdd.mapPartitions(partition_processor).toDF()

# 6) write the enriched data back to Delta
result_df.write.format("delta") \
    .mode("overwrite") \
    .save("/path/to/output/delta")
