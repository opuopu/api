import fetch from 'node-fetch';

const captchaVerify = async (token, userIp = '') => {
  try {
    console.log("Pre", `secret=${process.env.CAPTCHA_SECRET}&response=${token}&remoteip=${userIp}`)
    const res = await fetch(`https://www.google.com/recaptcha/api/siteverify`,
        {
            method: 'POST',
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `secret=${process.env.CAPTCHA_SECRET}&response=${token}&remoteip=${userIp}`
        }
    );
    const resData = await res.json();
    console.log(resData)
    if(resData.success) {
      return true
    }
    return false;
  } catch (error) {
    console.log(error)
    return false;
  }
};

module.exports = captchaVerify;
