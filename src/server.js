import express from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import cors from 'cors';

import { env } from './utils/env.js';
import { getAllContacts, getContactById } from './services/contacts.js';

const PORT = Number(env('PORT', '3000'));

export const startServer = () => {
  const app = express();

  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
  });

  app.use(cors());
  app.use(pinoHttp({ logger }));

  
  app.get('/contacts', async (req, res, next) => {
    try {
      const contacts = await getAllContacts();
      res.status(200).json({
        status: 200,
        message: 'Successfully found contacts!',
        data: contacts,
      });
    } catch (err) {
      next(err);
    }
  });

 
  app.get('/contacts/:contactId', async (req, res, next) => {
    try {
      const { contactId } = req.params;
      const contact = await getContactById(contactId);
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      res.status(200).json({
        status: 200,
        message: `Successfully found contact with id: ${contactId}`,
        data: contact,
      });
    } catch (err) {
      next(err);
    }
  });

  
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Not found!' });
  });

  
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
      message: 'Internal server error',
    });
  });

  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};
