// utils/fileUpload.js
import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error("File error", file, "error", new Error("Invalid File Type, only .png, .jpg, and .jpeg are allowed"))
    cb(new Error("Invalid File Type, only .png, .jpg, and .jpeg are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter
});

export default upload;