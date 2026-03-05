import { ERROR_CODES } from "@/shared/constants/error-codes";
import { AppException } from "@/shared/exceptions/app.exceptions";

export const imageConfig = {
  fileFilter: (_req, file, cb) =>
    file.originalname.match(/\.(jpg|jpeg|png|gif)$/)
      ? cb(null, true)
      : cb(new AppException(ERROR_CODES.IMAGE_TYPE_NOT_SUPPORTED), false),
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 MB
  },
};
