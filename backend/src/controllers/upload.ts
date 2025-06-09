import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'
import { fileSizeLimits } from '../middlewares/file'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.file) {
        return next(new BadRequestError('Файл не загружен'))
    }

    if (req.file.size < fileSizeLimits.minFileSize) {
        return next(new BadRequestError('Файл слишком маленький (менее 2KB)'))
    }

    try {
        await sharp(req.file.path).metadata() // Если не изображение — упадёт ошибка
    } catch (error) {
        return next(new BadRequestError('Неверный формат изображения'))
    }

    try {
        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file.filename}`
        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file.originalname,
        })
    } catch (error) {
        return next(error)
    }
}

export default {}
