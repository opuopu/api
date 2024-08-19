const bcrypt = require('bcryptjs');
import express from 'express';
import urljoin from 'url-join';
import { CheckPassword } from 'wordpress-hash-node';
import Schema from '../models';
import util from '../utils/common.utils';
import responseUtils from '../utils/response.utils';
const { generateToken } = require('../utils/auth.utils');
const { OAuth2Client } = require('google-auth-library');

const { User, Admin } = Schema;
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class AuthController {
  async adminLogin(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    const admin = await Admin.findOne({
      where: {
        email: req.body.identity,
      },
    });
    if (!admin) {
      response.status = 400;
      response.message = 'Invalid User info';
      response.success = false;
      return res.status(400).send(response.getResponse());
    }
    const compare = await bcrypt.compare(req.body.password, admin.password);
    if (!compare) {
      response.status = 400;
      response.message = 'Invalid User info';
      response.success = false;
      return res.status(400).send(response.getResponse());
    }

    const token = generateToken(
      {
        user_id: admin.id,
        user_email: admin.email,
      },
      req.body.remember == 1 ? '300h' : '24h',
    );

    const userObj: any = admin.toJSON();
    delete userObj.password;

    userObj.image_url = urljoin(util.getImagePath(req), userObj.image || '');
    userObj.image_thumb_url = urljoin(
      util.getImagePath(req),
      'thumb',
      userObj.image || '',
    );
    response.message = 'Login Success';
    response.data = {
      user: userObj,
      token,
    };
    res.send(response.getResponse());
  }

  userLogin = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    try {
      const response = new responseUtils();
      const user = await User.findOne({
        where: {
          email: req.body.email,
        },
      });
      if (!user) {
        response.status = 400;
        response.message = 'Invalid User info';
        response.success = false;
        return res.status(400).send(response.getResponse());
      }
      let compare = await bcrypt.compare(req.body.password, user.password);

      if (!compare) {
        compare = CheckPassword(req.body.password, user.password);
      }

      if (!compare) {
        response.status = 400;
        response.message = 'Invalid User info';
        response.success = false;
        return res.status(400).send(response.getResponse());
      }

      const token = generateToken(
        {
          user_id: user.id,
          user_email: user.email,
        },
        req.body.remember == 1 ? '300h' : '24h',
      );

      const userObj: any = user.toJSON();
      delete userObj.password;

      userObj.image_url = urljoin(util.getImagePath(req), userObj.image || '');
      userObj.image_thumb_url = urljoin(
        util.getImagePath(req),
        'thumb',
        userObj.image || '',
      );
      response.message = 'Login Success';
      response.data = {
        user: userObj,
        token,
      };
      res.send(response.response);
    } catch (error) {
      console.log(error);
      res.status(400).send(response.internalError);
    }
  };

  async userRegistration(req: express.Request, res: express.Response) {
    const response = new responseUtils();
    try {
      const { username, email, password, phone } = req.body;
      const newUser = await User.create({
        username,
        email,
        password,
        phone,
        is_phone_verify: 0,
        is_email_verify: 0,
      });
      const token = generateToken(
        {
          user_id: newUser.id,
          user_email: newUser.email,
        },
        req.body.remember == 1 ? '300h' : '24h',
      );

      response.data = { user: newUser, token };
      response.message = 'Account created successfully';
      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  }

  googleLogin = async (req: express.Request, res: express.Response) => {
    this.googleSignup(req, res);
  };

  googleSignup = async (req: express.Request, res: express.Response) => {
    const response = new responseUtils();
    const client = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
    try {
      const ticket = await client.verifyIdToken({
        idToken: req.body.idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const userPicture = payload?.picture;
      const user = await User.findOne({
        where: {
          email: payload.email,
        },
      });

      /**
       * Check if an user alrady exist with this email then login user
       */
      if (user) {
        const token = generateToken(
          {
            user_id: user.id,
            user_email: user.email,
          },
          req.body.remember == 1 ? '300h' : '240h',
        );

        const userObj: any = user.toJSON();
        delete userObj.password;

        response.data = {
          user: userObj,
          token,
        };
        return res.send(response.response);
      }

      /**
       *
       * Or create a new user
       *
       */

      const newUser = await User.create({
        email: payload?.email,
        username: payload?.email.split('@')[0],
        image: payload?.picture,
        avatar: payload?.picture,
      });

      delete (newUser as any).password;

      const newUserToken = generateToken(
        {
          user_id: newUser.id,
          user_email: newUser.email,
        },
        req.body.remember == 1 ? '300h' : '240h',
      );

      response.data = {
        user: newUser,
        token: newUserToken,
      };

      res.send(response.response);
    } catch (error) {
      console.log(error);
      return res.status(400).send(response.internalError);
    }
  };
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new AuthController();
