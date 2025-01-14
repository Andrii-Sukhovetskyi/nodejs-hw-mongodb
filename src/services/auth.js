import { randomBytes } from 'crypto';
import createHttpError from 'http-errors';
import path from 'node:path';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import handlebars from 'handlebars';

import { hashPassword, comparePasswords } from '../utils/hash.js';
import { UsersCollection } from '../db/models/user.js';
import { SessionsCollection } from '../db/models/session.js';
import {
  ONE_DAY,
  ONE_MINUTE,
  SMTP,
  TEMPLATES_DIR,
} from '../constants/index.js';
import { env } from '../utils/env.js';
import { sendEmail } from '../utils/sendMail.js';

export const registerUser = async (payload) => {
  const user = await UsersCollection.findOne({ email: payload.email });
  if (user) throw createHttpError(409, 'Email in use');

  const hashedPassword = await hashPassword(payload.password);

  return await UsersCollection.create({
    ...payload,
    password: hashedPassword,
  });
};

const createSession = () => {
  const accessToken = randomBytes(30).toString('base64');
  const refreshToken = randomBytes(30).toString('base64');

  const accessTokenValidUntil = new Date(Date.now() + ONE_MINUTE * 15);
  const refreshTokenValidUntil = new Date(Date.now() + ONE_DAY * 30);

  return {
    accessToken,
    refreshToken,
    accessTokenValidUntil,
    refreshTokenValidUntil,
  };
};

export const loginUser = async (payload) => {
  const user = await UsersCollection.findOne({ email: payload.email });
  if (!user) throw createHttpError(401, 'Email or password is incorrect');

  const isEqual = await comparePasswords(payload.password, user.password);
if (!isEqual) throw createHttpError(401, 'Email or password is incorrect');

  await SessionsCollection.deleteOne({ userId: user._id });

  const session = createSession();

  return await SessionsCollection.create({
    userId: user._id,
    ...session,
  });
};

export const refreshUsersSession = async ({ sessionId, refreshToken }) => {
  const session = await SessionsCollection.findOne({
    _id: sessionId,
    refreshToken,
  });

  if (!session) throw createHttpError(401, 'Session not found');

  const isSessionTokenExpired =
    Date.now() > new Date(session.refreshTokenValidUntil);

  if (isSessionTokenExpired)
    throw createHttpError(401, 'Session token expired');

  await SessionsCollection.deleteOne({
    _id: sessionId,
    refreshToken,
  });

  const newSession = createSession();

  return await SessionsCollection.create({
    userId: session.userId,
    ...newSession,
  });
};

export const logoutUser = async (sessionId) => {
  await SessionsCollection.deleteOne({ _id: sessionId });
};

export const sendResetEmail = async (email) => {
  const user = await UsersCollection.findOne({ email });
  if (!user) throw createHttpError(404, 'User not found!');

  const resetToken = jwt.sign(
    {
      sub: user._id,
      email,
    },
    env('JWT_SECRET'),
    {
      expiresIn: '5m',
    },
  );

  const resetPasswordTemplatePath = path.join(
    TEMPLATES_DIR,
    'reset-password-email.html',
  );

  const templatesSource = (
    await fs.readFile(resetPasswordTemplatePath)
  ).toString();

  const template = handlebars.compile(templatesSource);
  const html = template({
    name: user.name,
    link: `${env('APP_DOMAIN')}/reset-password?token=${resetToken}`,
  });

  try {
    await sendEmail({
      from: env(SMTP.SMTP_FROM),
      to: email,
      subject: 'Reset your password',
      html,
    });
  } catch {
    throw createHttpError(
      500,
      'Failed to send the email, please try again later.',
    );
  }
};

export const resetPassword = async (payload) => {
  let entries;

  try {
    entries = jwt.verify(payload.token, env('JWT_SECRET'));
  } catch (err) {
    if (err instanceof Error)
      throw createHttpError(401, 'Token is expired or invalid.');
    throw err;
  }

  const user = await UsersCollection.findOne({
    _id: entries.sub,
    email: entries.email,
  });
  if (!user) throw createHttpError(404, 'User not found!');

  const hashedPassword = await hashPassword(payload.password);

  await UsersCollection.updateOne(
    {
      _id: user._id,
    },
    {
      password: hashedPassword,
    },
  );

  await SessionsCollection.deleteOne({ userId: user._id });
};