import { isValidObjectId } from 'mongoose';
import createHttpError from 'http-errors';

export const isValidId = (req, res, next) => {
  const contactId = req.params.contactId;
  if (!isValidObjectId(contactId))
    throw createHttpError(400, 'Id is not valid');

  next();
};