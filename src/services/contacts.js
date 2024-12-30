import { SORT_ORDER } from '../constants/index.js';
import { contactsCollection } from '../db/models/contact.js';
import { calculatePaginationData } from '../utils/calculatePaginationData.js';

export const getAllContacts = async ({
  page = 1,
  perPage = 10,
  sortBy = SORT_ORDER.ASC,
  sortOrder = '_id',
}) => {
  const limit = perPage;
  const skip = (page - 1) * perPage;

  const contactsQuery = contactsCollection.find();
  const contactsCount = await contactsCollection
    .find()
    .merge(contactsQuery)
    .countDocuments();

  const contacts = await contactsQuery
    .skip(skip)
    .limit(limit)
    .sort({ [sortBy]: sortOrder })
    .exec();

  const paginationData = calculatePaginationData(contactsCount, page, perPage);

  return {
    data: contacts,
    ...paginationData,
  };
};

export const getContactById = async (contactId) => {
  const contact = await contactsCollection.findById(contactId);
  return contact;
};

export const createContact = async (payload) => {
  const contact = await contactsCollection.create(payload);
  return contact;
};

export const updateContact = async (contactId, payload, options = {}) => {
  const rawResult = await contactsCollection.findOneAndUpdate(
    { _id: contactId },
    payload,
    {
      new: true,
      includeResultMetadata: true,
      ...options,
    },
  );

  if (!rawResult || !rawResult.value) return null;

  return {
    contact: rawResult.value,
    isNew: Boolean(rawResult?.lastErrorObject?.upserted),
  };
};

export const deleteContact = async (contactId) => {
  const contact = await contactsCollection.findOneAndDelete({
    _id: contactId,
  });
  return contact;
};