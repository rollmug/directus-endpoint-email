import mailchimp from '@mailchimp/mailchimp_transactional';
import formidable from 'formidable';
import { firstValues } from 'formidable/src/helpers/firstValues.js';
import fs from 'fs';

const mail = mailchimp(process.env.MAILCHIMP_API_KEY);
const fromEmail = process.env.MAILCHIMP_FROM_EMAIL;
const fromName = "York County History Center";

const isValidEmail = (email) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

const isValidUpload = (upload) => {
	return typeof upload === 'object' && Object.keys(upload).length > 0 && (upload.mimetype && upload.mimetype === 'audio/mpeg');
};

const base64_encode = (file) => {
	const bitmap = fs.readFileSync(file);
	return Buffer.from(bitmap).toString('base64');
}

export default {
	id: 'email',
	handler: (router) => {
		/**
		 * test endpoint is working
		 */
		router.get('/', (req, res) => {
			return res.json({ success: 'Endpoint is working.' });
		});

		/**
		 * Test endpoint
		 */
		router.post('/test', async (req, res) => {
			if (req.accountability?.user == null) {
				res.status(403);
				return res.json({ error: `You don't have permission to access this.` });
			}

			return res.json({ success: 'Authorization was successful.' });
		});

		/**
		 * Your Story endpoint
		 */
		router.post('/story', async (req, res) => {
			let sites = [], email;

			if (req.accountability?.user == null) {
				res.status(403);
				return res.json({ error: `You don't have permission to access this.` });
			}

			try {
				const parsedData = JSON.parse(JSON.stringify(req.body));

				if (parsedData.email == null || !isValidEmail(parsedData.email)) {
					res.status(400);
					return res.json({ error: `Email is required and must be a valid email address.` });
				} else {
					email = parsedData.email;
				}

				if (typeof parsedData.sites === 'object' && Object.keys(parsedData.sites).length > 0) {
					sites = parsedData.sites;

					for (const site of sites) {
						if (!site.siteName || !site.locationInfo || !site.curatorCollection || !site.address || !site.thumbnail) {
							res.status(400);
							return res.json({ error: `Each site object must contain keys for siteName, locationInfo, curatorCollection, address, and thumbnail.` });
						}
					}
				} else {
					res.status(400);
					return res.json({ error: `sites must be an object with length > 0.` });
				}

				const message = {
					from_email: fromEmail,
					from_name: fromName,
					subject: "Discover your York County story",
					to: [
						{
							email: email,
							type: "to"
						}
					],
					inline_css: false,
					merge_vars: [
						{
							rcpt: email,
							vars: [
								{
									name: "preheader",
									content: "Here are the sites you saved during today’s visit."
								},
								{
									name: "sites",
									content: sites
								}
							]
						}
					]
				};

				try {
					const response = await mail.messages.sendTemplate({
						template_name: "your-story",
						template_content: [{}],
						message: message
					});

					return res.send(response);
				} catch (error) {
					console.error(error);
					res.status(400);
					return res.json({ error: `Error sending email.` });
				}
			} catch (error) {
				res.status(400);
				return res.json({ error: `Invalid JSON data.` });
			}
		});

		/**
		 * Audio Booth endpoint
		 */
		router.post('/audio', async (req, res) => {
			let isMinor = true, question, email, fields, files, audio, base64File;

			if (req.accountability?.user == null) {
				res.status(403);
				return res.json({ error: `You don't have permission to access this.` });
			}

			try {
				const form = formidable({});
				[fields, files] = await form.parse(req);

				const data = firstValues(form, fields);
				const upload = firstValues(form, files);

				if (data.email == null || !isValidEmail(data.email)) {
					res.status(400);
					return res.json({ error: `Email is required and must be a valid email address.` });
				} else {
					email = data.email;
				}

				if (data.question == null || data.question.trim() === '') {
					res.status(400);
					return res.json({ error: `Question text is required.` });
				} else {
					question = data.question.trim();
				}

				if (!data.isMinor || data.isMinor === null || data.isMinor === undefined || data.isMinor.trim() === '' || (data.isMinor === "true") || (data.isMinor === "1")) {
					isMinor = true;
				} else {
					isMinor = false;
				}

				// return res.json({ email, question, isMinor, upload });

				if (!isValidUpload(upload.audio)) {
					res.status(400);
					return res.json({ error: `Audio file is required, and must be of type audio/mpeg.` });
				} else {
					audio = upload.audio;
					base64File = base64_encode(audio.filepath);
				}

				let templateVars;

				if (isMinor) {
					templateVars = {
						header: "Thank You for Recording",
						p1: `Your recording is attached. You answered the question: “${question}”`,
						p2: "If you would like your York County memories to be part of our archives, please forward your recording and the attached permission form to: stories@yorkhistorycenter.org."
					}
				} else {
					templateVars = {
						header: "Thank You for Sharing",
						p1: "Your York County memories are now part of the history center’s archives. We may reach out to you in the future for more information about your story.",
						p2: `Your recording is attached. You answered the question: “${question}”`
					}
				}

				const message = {
					from_email: fromEmail,
					from_name: fromName,
					subject: "Your Story Audio, from York County History Center",
					to: [
						{
							email: email,
							type: "to"
						}
					],
					inline_css: false,
					merge_vars: [
						{
							rcpt: email,
							vars: [
								{
									name: "preheader",
									content: `Here’s your audio recording from the York County History Center.`
								},
								{
									name: "header",
									content: templateVars.header
								},
								{
									name: "p1",
									content: templateVars.p1
								},
								{
									name: "p2",
									content: templateVars.p2
								}
							]
						}
					],
					attachments: [
						{
							type: audio.mimetype,
							name: audio.originalFilename,
							content: base64File
						}
					]
				};

				try {
					const response = await mail.messages.sendTemplate({
						template_name: "audio-booth",
						template_content: [{}],
						message: message
					});

					return res.send(response);
				} catch (error) {
					console.error(error);
					res.status(400);
					return res.json({ error: `Error sending email.` });
				}
			} catch (error) {
				res.status(400);
				return res.json({ error: `Invalid JSON data.` });
			}
		});
	}
};
