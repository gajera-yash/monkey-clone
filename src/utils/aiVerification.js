import axios from 'axios';

const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

/**
 * Verifies if the person in the image is female using Groq Llama 3.2 Vision
 * @param {string} imageUrl - The public URL of the captured face image
 * @returns {Promise<{isFemale: boolean, confidence: number, reason: string}>}
 */
export const verifyGenderFromImage = async (imageUrl) => {
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: "llama-3.2-11b-vision-preview",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this image and determine if the person is a female. If the person is clearly female, respond with 'GENDER: FEMALE'. If the person is male or not clearly female, respond with 'GENDER: MALE'. Also provide a short 1-sentence reason. Respond in JSON format: { 'gender': 'female' | 'male', 'reason': '...' }"
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageUrl
                                }
                            }
                        ]
                    }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1
            },
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const result = response.data.choices[0].message.content;
        const data = typeof result === 'string' ? JSON.parse(result) : result;

        return {
            isFemale: data.gender.toLowerCase() === 'female',
            reason: data.reason
        };
    } catch (error) {
        console.error("Groq Vision API Error:", error);
        throw new Error("AI Verification failed to process image.");
    }
};
