import { rateLimit } from 'express-rate-limit'

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 50,
    statusCode: 429,
    message: 'Слишком много запросов, попробуйте позже',
    // skip: (req) => {
    //     // Пропускать лимитер в тестах или на конкретных маршрутах
    //     return (
    //         process.env.NODE_ENV === 'test' || req.path.startsWith('/customers')
    //     )
    // },
})

export default limiter

// import rateLimit from 'express-rate-limit'

// export const generalLimiter = rateLimit({
//     windowMs: 60 * 1000,
//     max: 5,
//     message: 'Слишком много запросов. Попробуйте позже.',
//     standardHeaders: true,
//     legacyHeaders: false,
//     skip: (req) => process.env.NODE_ENV === 'test', // отключаем для тестов
// })

// export const protectedLimiter = rateLimit({
//     windowMs: 60 * 1000,
//     max: 3,
//     message: 'Слишком много запросов к защищённым данным.',
//     standardHeaders: true,
//     legacyHeaders: false,
//     skip: (req) => process.env.NODE_ENV === 'test', // отключаем для тестов
// })
