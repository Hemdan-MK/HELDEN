const nodemailer = require('nodemailer');


let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  }
});

const sendEmail = async (email, otp) => {
  let mailOptions = {
    from: 'hemdanmkonline@gmail.com',
    to: email,
    subject: 'OTP Verification',
    text: `Your One-Time Password (OTP) is : ${otp}`
  };
  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP : ' + otp);
    console.log('OTP Sented: ' + email);

  } catch (error) {
    console.log("error senting otp : " + error.message);
  }
}


module.exports = sendEmail;