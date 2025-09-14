import requests
import boto3
from botocore.exceptions import NoCredentialsError
from urllib.parse import urlparse
import asyncio
from .exceptions import ImageDownloadError

async def download_image(url: str) -> bytes:
    """
    Downloads an image from an S3 URL.
    Supports public/presigned URLs via requests, and private URLs via boto3.
    """
    try:
        parsed_url = urlparse(url)
        if parsed_url.scheme == 's3':
            # Private S3 URL, use boto3
            s3_client = boto3.client('s3')
            bucket = parsed_url.netloc
            key = parsed_url.path.lstrip('/')
            try:
                response = s3_client.get_object(Bucket=bucket, Key=key)
                return response['Body'].read()
            except NoCredentialsError:
                raise ImageDownloadError("Credentials not available for private S3 access")
            except Exception as e:
                raise ImageDownloadError(f"Failed to download from S3: {e}")
        else:
            # Public or presigned URL, use requests
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, requests.get, url)
            response.raise_for_status()
            return response.content
    except requests.RequestException as e:
        raise ImageDownloadError(f"Failed to download image: {e}")
    except Exception as e:
        raise ImageDownloadError(f"Unexpected error during download: {e}")
