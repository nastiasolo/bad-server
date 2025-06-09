import { rateLimit } from 'express-rate-limit'

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов, попробуйте позже',
    skip: (req) => {
        // Пропускать лимитер в тестах или на конкретных маршрутах
        return (
            process.env.NODE_ENV === 'test' || req.path.startsWith('/customers')
        )
    },
})

export default limiter
