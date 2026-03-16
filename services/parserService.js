const { OpenAI } = require('openai');

const getOpenAIClient = () => {
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key') {
        return null;
    }
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

/**
 * Phân tích câu hỏi tiếng Việt của User bằng AI (LLM) và trả về format JSON
 * phục vụ cho việc lọc bảng hàng. KHÔNG tạo ra business answer ở bước này.
 */
async function parseInventoryQuery(question) {
    const openai = getOpenAIClient();

    // Mock Mode Support
    if (!openai) {
        console.log("[MOCK PARSER] Phân tích ngữ cảnh mô phỏng cho câu hỏi:", question);
        return {
            project_name: question.toLowerCase().includes("dương kinh") ? "Vinhomes Dương Kinh" : null,
            bedroom_type: question.toLowerCase().includes("1pn") ? "1PN" : (question.toLowerCase().includes("2pn") ? "2PN" : null),
            product_type: null,
            direction: question.toLowerCase().includes("đông nam") ? "Đông Nam" : null,
            min_price: null,
            max_price: question.toLowerCase().includes("4 tỷ") ? 4000000000 : (question.toLowerCase().includes("5 tỷ") ? 5000000000 : null),
            tower: null,
            floor_min: question.match(/tầng 10/) ? 10 : null,
            floor_max: question.match(/đến 15/) ? 15 : null,
            status: "available",
            sort_by: null,
            sort_order: null
        };
    }

    const systemPrompt = `You are a real-estate query parser.
Analyze the user's Vietnamese question asking for real-estate inventory.
Extract conditions and return ONLY a valid JSON object matching this schema precisely. No extra text or markdown.
Leave values as null if they are not specifically mentioned.

Schema:
{
  "project_name": "string or null",
  "bedroom_type": "string or null (e.g. '1PN', '2PN', '3PN')",
  "product_type": "string or null",
  "direction": "string or null (e.g. 'Đông Nam', 'Tây Bắc')",
  "min_price": "number or null",
  "max_price": "number or null (e.g. 'dưới 4 tỷ' means max_price: 4000000000)",
  "tower": "string or null",
  "floor_min": "number or null",
  "floor_max": "number or null",
  "status": "available",
  "sort_by": "string or null",
  "sort_order": "string or null"
}

Rule: If status is not explicitly mentioned, default to "available". Do not include any reasoning.`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: question }
            ],
            temperature: 0.0,
            response_format: { type: "json_object" }
        });
        
        const jsonContent = response.choices[0].message.content.trim();
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error('[ERROR] Parser Service Error:', error.message);
        throw new Error('Failed to parse inventory query');
    }
}

module.exports = { parseInventoryQuery };
