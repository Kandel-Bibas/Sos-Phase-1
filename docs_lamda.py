import json
import boto3
s3 = boto3.client("s3")
BUCKET = "ms-sos-legal-documents"
PREFIX = "source-documents/"

def handler(event, context):
    body = json.loads(event.get("body") or "{}")
    filename = body["filename"]
    key = f"{PREFIX}{filename}"

    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": key},
        ExpiresIn=300
    )

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps({"url": url})
    }
