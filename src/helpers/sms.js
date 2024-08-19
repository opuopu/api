import fetch from 'node-fetch';

const smsHelper = async (number, text = '') => {
  try {
    await fetch(
      `https://api.sms.net.bd/sendsms?api_key=${process.env.SMS_HASH_TOKEN}&msg=${text}&to=${number}&sender_id=${process.env.SMS_SENDER_ID}`
    );
    return true;
  } catch (error) {
    console.log(error)
    return false;
  }
};

module.exports = smsHelper;
