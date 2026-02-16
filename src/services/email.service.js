import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `${process.env.APP_NAME} <${process.env.EMAIL_USER}>`, // sender address
      to,
      subject,
      text,
      html,
    });
    return true
  } catch (error) {
    console.error('Error sending email:', error);
    return false
  }
};

const sendEmailWithRetry = async(to, subject, text, html, maxRetries = 5) => {
    for(let tries = 0; tries <= maxRetries; tries++){
        const succeed = await sendEmail(to, subject, text, html)
        if(succeed){
            return true
        } else{
            console.warn(`Email could not be sent for ${tries} times`)
            if(tries < maxRetries){
                const delay = Math.pow(2, tries) * 1000  // 2s, 4s, 8s, 16s, 32s
                console.log(`Retrying in ${delay/1000} seconds...`)
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
        
    }
    console.error(`Email failed after ${maxRetries} attempts`)
    return false
}

const sendRegistrationEmail = async(userEmail, fullname) => {
    const subject = "User successfully registered"
    const text = `Hello ${fullname},\n\n Thank you for registering to ${process.env.APP_NAME}\n Best regards,\n\n The ${process.env.APP_NAME} Team`
    const html = `<p>Hello ${fullname}</p><p>Thank you for registering to ${process.env.APP_NAME}</p><p>Best regards,<br> The ${process.env.APP_NAME} Team</p>`
    const sent = await sendEmailWithRetry(userEmail, subject, text, html)
    if(sent){
      console.log(`Registration Email sent successfully`)
    } else {
      console.error(`Could not send Registration Email`)
    }
}

const sendChangeEmailRequest = async(userEmail, fullname, magicLink) => {
  const subject = "Confirm your Email change"
  const text = `Hello ${fullname}\n\n To confirm your email change, please click the link below:\n\n ${magicLink}\n\n This link expires in 15 minutes.\n\nIf you didn't request this change, please ignore this email.`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>Hello ${fullname},</p>
      <p>To confirm your email change, please click the button below:</p>
      <br>
      <a href="${magicLink}" 
         style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Verify Email Change
      </a>
      <br><br>
      <p style="color: #666;">This link expires in 15 minutes.</p>
      <p style="color: #666;">If you didn't request this change, please ignore this email.</p>
    </div>`
  const sent = await sendEmailWithRetry(userEmail, subject, text, html)
  if(sent){
      console.log("Change-email request sent successfully")
    } else {
      console.error("Failed to send change-email request")
    }
  return sent
}
export {
  sendRegistrationEmail,
  sendChangeEmailRequest
}