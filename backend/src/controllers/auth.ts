import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { Error as MongooseError } from 'mongoose'
import { REFRESH_TOKEN } from '../config'
import BadRequestError from '../errors/bad-request-error'
import ConflictError from '../errors/conflict-error'
import NotFoundError from '../errors/not-found-error'
import UnauthorizedError from '../errors/unauthorized-error'
import User, { generateAccessToken, generateRefreshToken } from '../models/user'

// POST /auth/login
const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body
        const user = await User.findUserByCredentials(email, password)
        const accessToken = generateAccessToken(user)
        const refreshToken = await generateRefreshToken(user)
        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )
        return res.json({
            success: true,
            user,
            accessToken,
        })
    } catch (err) {
        return next(err)
    }
}

// POST /auth/register
const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, name } = req.body
        const newUser = new User({ email, password, name })
        await newUser.save()
        const accessToken = generateAccessToken(newUser)
        const refreshToken = await generateRefreshToken(newUser)

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )
        return res.status(constants.HTTP_STATUS_CREATED).json({
            success: true,
            user: newUser,
            accessToken,
        })
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof Error && error.message.includes('E11000')) {
            return next(
                new ConflictError('Пользователь с таким email уже существует')
            )
        }
        return next(error)
    }
}

// GET /auth/user
const getCurrentUser = async (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        console.log('res.locals.user:', res.locals.user)
        const user = await User.findById(userId).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.json({ user, success: true })
    } catch (error) {
        next(error)
    }
}

// Можно лучше: вынести общую логику получения данных из refresh токена
const deleteRefreshTokenInUser = async (req: Request) => {
    const { cookies } = req
    const refreshToken = cookies[REFRESH_TOKEN.cookie.name]

    if (!refreshToken) {
        throw new UnauthorizedError('Не валидный токен')
    }

    let decodedRefreshTkn: JwtPayload
    try {
        decodedRefreshTkn = jwt.verify(
            refreshToken,
            REFRESH_TOKEN.secret
        ) as JwtPayload
    } catch (error) {
        throw new UnauthorizedError('Невалидный refresh-токен')
    }

    const user = await User.findById(decodedRefreshTkn._id).orFail(
        () => new UnauthorizedError('Пользователь не найден')
    )

    const refreshTokenHash = crypto
        .createHmac('sha256', REFRESH_TOKEN.secret)
        .update(refreshToken)
        .digest('hex')

    const tokenIndex = user.tokens.findIndex(
        (tokenObj) => tokenObj.token === refreshTokenHash
    )

    if (tokenIndex === -1) {
        throw new UnauthorizedError('Невалидный refresh-токен')
    }

    user.tokens.splice(tokenIndex, 1)

    await user.save()

    return user
}

// Реализация удаления токена из базы может отличаться
// GET  /auth/logout
const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await deleteRefreshTokenInUser(req)
        res.clearCookie(REFRESH_TOKEN.cookie.name, {
            ...REFRESH_TOKEN.cookie.options,
            expires: new Date(0),
        })
        res.status(200).json({
            success: true,
        })
    } catch (error) {
        next(error)
    }
}

// GET  /auth/token
const refreshAccessToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userWithRefreshTkn = await deleteRefreshTokenInUser(req)
        const accessToken = generateAccessToken(userWithRefreshTkn)
        const refreshToken = await generateRefreshToken(userWithRefreshTkn)
        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        )
        return res.json({
            success: true,
            user: userWithRefreshTkn,
            accessToken,
        })
    } catch (error) {
        next(error)
    }
}

const getCurrentUserRoles = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = res.locals.user._id
    try {
        await User.findById(userId, req.body, {
            new: true,
        }).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.status(200).json(res.locals.user.roles)
    } catch (error) {
        next(error)
    }
}

const updateCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
            new: true,
        }).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )
        res.status(200).json(updatedUser)
    } catch (error) {
        next(error)
    }
}

export {
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
}
