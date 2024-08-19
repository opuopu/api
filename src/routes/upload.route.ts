const express = require('express');
import multer from 'multer'
const router = express.Router();
import { adminFileUploads } from '../middleware/fileAuth.middleware';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/images/')
  },
  filename: function (req, file, cb) {
    cb(null, 'images-' + Date.now() + `.${file.originalname.split(".")[1]}`)
  }
})

const imageUpload = multer({ storage: storage, limits: { fileSize: 1500000 } })


import uploadController from '../controllers/upload.controller';

router.post('/upload/image', adminFileUploads, imageUpload.single('image'), uploadController.uploadImage)
router.post('/upload/icon', adminFileUploads, imageUpload.single('icon'), uploadController.uploadIcon)

export default router;