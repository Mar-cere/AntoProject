import express from 'express';
import cloudinary from 'cloudinary';

const router = express.Router();

router.post('/signature', (req, res) => {
  const timestamp = Math.round((new Date).getTime()/1000);
  const paramsToSign = {
    timestamp,
    upload_preset: 'Anto Avatar',
    type: 'authenticated'
  };
  const signature = cloudinary.v2.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

  res.json({
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    uploadPreset: 'Anto Avatar'
  });
});

export default router;
