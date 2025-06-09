import { unlink } from 'fs'
import mongoose, { Document } from 'mongoose'
import { join } from 'path'

export interface IFile {
    fileName: string
    originalName: string
}

export interface IProduct extends Document {
    _id: mongoose.Types.ObjectId
    title: string
    image: IFile
    category: string
    description: string
    price: number
}

const cardsSchema = new mongoose.Schema<IProduct>(
    {
        title: {
            type: String,
            unique: true,
            required: [true, 'Поле "title" должно быть заполнено'],
            minlength: [2, 'Минимальная длина поля "title" - 2'],
            maxlength: [30, 'Максимальная длина поля "title" - 30'],
        },
        image: {
            fileName: {
                type: String,
                required: [true, 'Поле "image.fileName" должно быть заполнено'],
            },
            originalName: String,
        },
        category: {
            type: String,
            required: [true, 'Поле "category" должно быть заполнено'],
        },
        description: {
            type: String,
        },
        price: {
            type: Number,
            default: null,
        },
    },
    { versionKey: false }
)

cardsSchema.index({ title: 'text' })

// Можно лучше: удалять старое изображением перед обновлением сущности
cardsSchema.pre('findOneAndUpdate', async function () {
    // @ts-ignore
    const update = this.getUpdate() as mongoose.UpdateQuery<IProduct>
    if (!update?.image && !update?.$set?.image) return
    const docToUpdate = await this.model.findOne(this.getQuery())
    if (docToUpdate?.image?.fileName) {
        const imagePath = join(
            __dirname,
            `../public/${docToUpdate.image.fileName}`
        )
        unlink(imagePath, (err) => {
            if (err)
                console.error(`Ошибка при удалении файла ${imagePath}:`, err)
        })
    }
})

// Можно лучше: удалять файл с изображением после удаление сущности
cardsSchema.post('findOneAndDelete', async (doc: IProduct) => {
    if (!doc?.image?.fileName) return

    const imagePath = join(__dirname, `../public/${doc.image.fileName}`)
    unlink(imagePath, (err) => {
        if (err) console.error(`Ошибка при удалении файла ${imagePath}:`, err)
    })
})

export default mongoose.model<IProduct>('product', cardsSchema)
