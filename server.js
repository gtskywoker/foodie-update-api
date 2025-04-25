require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ✅ ตั้งค่า Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key:    process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// ✅ สร้าง storage สำหรับ multer
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'foodie/products',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});
const upload = multer({ storage });

// ✅ Route: อัปโหลดภาพใหม่ และลบภาพเก่า (ถ้ามี)
app.post('/upload-new-image', upload.single('file'), async (req, res) => {
    const requestStartTime = Date.now();
    const requestTimestamp = new Date().toISOString();
    console.log(`[${requestTimestamp}] Request received for /upload-new-image. Body: ${JSON.stringify(req.body)}`);

    const oldPublicId = req.body.oldPublicId;

    if (!req.file) {
        const errorTimestamp = new Date().toISOString();
        console.error(`[${errorTimestamp}] No file uploaded`);
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        let uploadResult;
        const uploadStartTime = Date.now();
        uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: 'foodie/products' });
        const uploadEndTime = Date.now();
        const uploadDuration = uploadEndTime - uploadStartTime;
        const uploadTimestamp = new Date().toISOString();
        console.log(`[${uploadTimestamp}] New image uploaded to Cloudinary. Secure URL: ${uploadResult.secure_url}, Public ID: ${uploadResult.public_id}`);

        // ลบรูปภาพเก่าถ้ามี publicId
        if (oldPublicId) {
            const deleteStartTime = Date.now();
            const deleteResult = await cloudinary.uploader.destroy(oldPublicId);
            const deleteEndTime = Date.now() - deleteStartTime;
            const deleteTimestamp = new Date().toISOString();
            console.log(`[${deleteTimestamp}] Old image (publicId: ${oldPublicId}) deleted from Cloudinary in ${deleteEndTime}ms. Result: ${JSON.stringify(deleteResult)}`);

            // ตรวจสอบผลลัพธ์การลบ
            if (deleteResult.result !== "ok") {
                // หากลบไม่สำเร็จ, log ข้อความผิดพลาดที่ได้รับจาก Cloudinary
                console.error(`[${deleteTimestamp}] Error deleting image (publicId: ${oldPublicId}) from Cloudinary. Result: ${JSON.stringify(deleteResult)}`);
            }
        }

        const responseTime = Date.now() - requestStartTime;
        const responseTimestamp = new Date().toISOString();
        console.log(`[${requestTimestamp}] Response sent for /upload-new-image in ${responseTime}ms`);

        res.status(200).json({
            message: 'New image uploaded successfully',
            imageUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
        });

    } catch (error) {
        const errorTimestamp = new Date().toISOString();
        console.error(`[${errorTimestamp}] Error updating image:`, error);
        res.status(500).json({ error: 'Failed to upload new image' });
    }
});

// ✅ ตัวอย่าง Route อื่น (ถ้ามี)
app.get('/ping', (req, res) => res.send('pong'));

// ✅ เริ่ม server
app.listen(PORT, () => {
    console.log(`🚀 Upload New Image API running on port ${PORT}`);
});
