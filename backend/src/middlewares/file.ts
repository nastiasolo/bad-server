import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { join } from 'path'
import fs from 'fs'
import crypto from 'crypto'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

export const fileSizeLimits = {
    minFileSize: 2 * 1024,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
}

const storage = multer.diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        const destinationPath = join(
            __dirname,
            process.env.UPLOAD_PATH_TEMP
                ? `../public/${process.env.UPLOAD_PATH_TEMP}`
                : '../public'
        )
        console.log('Destination Path:', destinationPath)

        if (!fs.existsSync(destinationPath)) {
            fs.mkdirSync(destinationPath, { recursive: true })
            console.log(`Directory created: ${destinationPath}`)
        }

        cb(null, destinationPath)
    },

    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        const uniqueName = crypto.randomBytes(5).toString('hex')
        cb(null, `${uniqueName}${file.originalname}`)
    },
})

const types = [
    'image/png',
    'image/jpg',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
]

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    console.log('File type:', file.mimetype)
    if (!types.includes(file.mimetype)) {
        return cb(null, false)
    }

    return cb(null, true)
}

export default multer({
    storage,
    fileFilter,
    limits: {
        fileSize: fileSizeLimits.maxFileSize,
    },
})
