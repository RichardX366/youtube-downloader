const { Configuration, OpenAIApi } = require('openai');
const { config } = require('dotenv');
config({ path: __dirname + '/.env' });

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openAI = new OpenAIApi(configuration);

const prompt = async (text) => {
  const {
    data: { choices },
  } = await openAI.createChatCompletion({
    model: 'gpt-4o-mini',
    messages: [
      {
        content: text,
        role: 'user',
      },
    ],
  });
  const message = choices[0].message?.content;
  return message;
};

const main = async () => {
  console.log(await prompt(process.argv[2]));
};
main();
