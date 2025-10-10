# utils/aws_utils.py
import os
import logging
from typing import Optional, Tuple
import urllib.parse

import boto3
from botocore.config import Config
from botocore.exceptions import NoCredentialsError, ClientError, EndpointConnectionError
import requests

logger = logging.getLogger(__name__)

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "sentinelassets")

class DownloadError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status

def _build_s3_client():
    cfg = Config(region_name=AWS_REGION, retries={"max_attempts": 5, "mode": "standard"}, signature_version="s3v4")
    akid = os.getenv("AWS_ACCESS_KEY_ID")
    asec = os.getenv("AWS_SECRET_ACCESS_KEY")
    atok = os.getenv("AWS_SESSION_TOKEN")
    if akid and asec:
        return boto3.client("s3", aws_access_key_id=akid, aws_secret_access_key=asec, aws_session_token=atok, config=cfg)
    return boto3.client("s3", config=cfg)

def _is_s3_http_host(netloc: str) -> bool:
    h = netloc.lower()
    return (
        h.endswith(".s3.amazonaws.com")
        or (".s3-" in h and h.endswith(".amazonaws.com"))
        or (h.startswith("s3.") and h.endswith(".amazonaws.com"))
        or (".s3." in h and h.endswith(".amazonaws.com"))
    )

def _parse_s3_http_url(url: str) -> Optional[Tuple[str, str]]:
    p = urllib.parse.urlparse(url)
    if p.scheme not in ("http", "https"):
        return None
    if not _is_s3_http_host(p.netloc):
        return None
    host = p.netloc.split(":")[0].lower()
    path = p.path.lstrip("/")
    if not path:
        return None
    # virtual-hosted
    if host.count(".") >= 3 and host.split(".")[0] != "s3":
        bucket = host.split(".")[0]
        return bucket, urllib.parse.unquote(path)
    # path-style
    parts = path.split("/", 1)
    if len(parts) == 2:
        bucket, key = parts
        return bucket, urllib.parse.unquote(key)
    return None

def _parse_s3_uri(uri: str) -> Optional[Tuple[str, str]]:
    if not uri.lower().startswith("s3://"):
        return None
    p = urllib.parse.urlparse(uri)
    bucket = p.netloc
    key = p.path.lstrip("/")
    if not bucket or not key:
        return None
    return bucket, urllib.parse.unquote(key)

def is_presigned_s3_url(url: str) -> bool:
    p = urllib.parse.urlparse(url)
    if p.scheme not in ("http", "https"):
        return False
    qs = urllib.parse.parse_qs(p.query)
    return any(k.lower() == "x-amz-signature" for k in qs.keys())

def check_aws_credentials() -> Tuple[bool, str]:
    try:
        sts = boto3.client("sts", config=Config(region_name=AWS_REGION))
        ident = sts.get_caller_identity()
        return True, ident.get("Arn", "unknown-arn")
    except NoCredentialsError:
        return False, "No AWS credentials found (env/shared config/IAM role missing)."
    except Exception as e:
        return False, f"STS check failed: {e}"

def download_file(source: str) -> Optional[bytes]:
    """
    Download from:
      - presigned/public HTTP(S) URL
      - s3://bucket/key
      - S3 HTTP URL (virtual-hosted or path-style)
      - plain S3 key in default bucket (AWS_BUCKET_NAME)
    Returns bytes; raises DownloadError for 401/403/404; returns None on other failures.
    """
    s3 = _build_s3_client()

    # s3://bucket/key
    uri = _parse_s3_uri(source)
    if uri:
        bucket, key = uri
        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
            return obj["Body"].read()
        except NoCredentialsError:
            raise DownloadError(401, "AWS credentials not available")
        except ClientError as e:
            from typing import Any, Dict, cast
            resp = cast(Dict[str, Any], getattr(e, "response", {}))
            code = resp.get("Error", {}).get("Code")
            if code in ("AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
                raise DownloadError(403, f"S3 access denied for s3://{bucket}/{key}")
            if code == "NoSuchKey":
                raise DownloadError(404, f"S3 object not found: s3://{bucket}/{key}")
            raise

    # HTTP(S)
    if source.lower().startswith(("http://", "https://")):
        try:
            resp = requests.get(source, timeout=60, allow_redirects=True)
            resp.raise_for_status()
            return resp.content
        except requests.HTTPError as rexc:
            status = getattr(rexc.response, "status_code", 0)
            s3_parts = _parse_s3_http_url(source)
            if s3_parts and not is_presigned_s3_url(source):
                ok, ident = check_aws_credentials()
                if not ok:
                    raise DownloadError(401, ident)
                bucket, key = s3_parts
                try:
                    obj = s3.get_object(Bucket=bucket, Key=key)
                    return obj["Body"].read()
                except ClientError as e2:
                    from typing import Any, Dict, cast
                    resp = cast(Dict[str, Any], getattr(e2, "response", {}))
                    code = resp.get("Error", {}).get("Code")
                    if code in ("AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
                        raise DownloadError(403, f"S3 access denied for s3://{bucket}/{key} (caller: {ident})")
                    if code == "NoSuchKey":
                        raise DownloadError(404, f"S3 object not found: s3://{bucket}/{key}")
                    raise
            if status in (401, 403, 404):
                raise DownloadError(status, f"HTTP error {status}")
            logger.warning("HTTP download failed (%s): %s", status, source)
            return None
        except requests.RequestException as e:
            logger.warning("HTTP request error: %s", e)
            s3_parts = _parse_s3_http_url(source)
            if s3_parts and not is_presigned_s3_url(source):
                ok, ident = check_aws_credentials()
                if not ok:
                    raise DownloadError(401, ident)
                bucket, key = s3_parts
                try:
                    obj = s3.get_object(Bucket=bucket, Key=key)
                    return obj["Body"].read()
                except ClientError as e2:
                    code = e2.response.get("Error", {}).get("Code")
                    if code in ("AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
                        raise DownloadError(403, f"S3 access denied for s3://{bucket}/{key} (caller: {ident})")
                    if code == "NoSuchKey":
                        raise DownloadError(404, f"S3 object not found: s3://{bucket}/{key}")
                    raise
            return None

    # Plain key in default bucket
    try:
        obj = s3.get_object(Bucket=AWS_BUCKET_NAME, Key=source)
        return obj["Body"].read()
    except ClientError as e:
        from typing import Any, Dict, cast
        resp = cast(Dict[str, Any], getattr(e, "response", {}))
        code = resp.get("Error", {}).get("Code")
        if code in ("AccessDenied", "InvalidAccessKeyId", "SignatureDoesNotMatch"):
            raise DownloadError(403, f"S3 access denied for s3://{AWS_BUCKET_NAME}/{source}")
        if code == "NoSuchKey":
            raise DownloadError(404, f"S3 object not found: s3://{AWS_BUCKET_NAME}/{source}")
        raise
    except (EndpointConnectionError,) as e:
        logger.error("S3 endpoint error: %s", e)
        return None
