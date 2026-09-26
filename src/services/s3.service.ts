import "dotenv/config";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION ?? "ap-northeast-2";

const client = new S3Client({ region });

const requireBucket = () => {
  if (!bucket) throw new Error("S3_BUCKET_NAME is not configured");
  return bucket;
};

export const putPrivateObject = async (input: {
  key: string;
  body: Buffer;
  contentType: string;
}) => {
  await client.send(
    new PutObjectCommand({
      Bucket: requireBucket(),
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
};

export const deletePrivateObject = async (key: string) => {
  await client.send(new DeleteObjectCommand({ Bucket: requireBucket(), Key: key }));
};

export const createPrivateObjectUrl = (key: string) =>
  getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: requireBucket(), Key: key }),
    { expiresIn: 900 },
  );
