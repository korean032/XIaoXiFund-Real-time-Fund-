/// <reference path="../types.d.ts" />
interface Env {
  CHATANYWHERE_API_KEY: string;
  VVEAI_API_KEY: string;
}

interface RequestBody {
  image: string; // Base64 data URL
}

const API_CONFIGS = [
  {
    name: 'Primary (ChatAnywhere)',
    baseUrl: 'https://api.chatanywhere.tech/v1',
    envKey: 'CHATANYWHERE_API_KEY' as keyof Env
  },
  {
    name: 'Backup (VVEAI)',
    baseUrl: 'https://api.vveai.com/v1',
    envKey: 'VVEAI_API_KEY' as keyof Env
  }
];

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;
    const body = await request.json() as RequestBody;
    
    if (!body.image) {
      return new Response(JSON.stringify({ error: 'Image data is required' }), { status: 400 });
    }

    let lastError: Error | null = null;

    // Try each API configuration in order
    for (const config of API_CONFIGS) {
      const apiKey = env[config.envKey];
      
      if (!apiKey || apiKey === "placeholder_key") {
        console.warn(`Missing API key for ${config.name}`);
        continue;
      }

      try {
        console.log(`Attempting image recognition with ${config.name}...`);
        
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `请分析这张基金持仓截图（可能来自支付宝、天天基金、蛋卷等APP），提取以下关键数据：

**可能的字段名称参考：**
- 总金额/持仓金额/市值/金额 → amount
- 成本价/买入均价/持仓成本价 → costPrice  
- 持有份额/当前持有份（克）/持有份 → shares

**支付宝界面特征：**
- "金额 XXX元" 表示当前市值
- "当前持有份（克）" 显示持有数量
- 需要用"金额 ÷ 持有份"计算出成本价

**输出格式（仅返回JSON，不要任何其他文字）：**
{
  "amount": 数字（总投入金额或当前市值）,
  "costPrice": 数字（成本价/买入均价，如果有的话）,
  "shares": 数字（持有份额），
  "note": "识别到的数据来源说明"
}

**规则：**
- 只返回纯JSON，不要markdown代码块
- 数字不要包含单位、逗号、货币符号
- 如果某项无法识别，设为null
- 优先识别"总投入"或"持仓成本"作为amount`
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: body.image
                    }
                  }
                ]
              }
            ],
            max_tokens: 500
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(`${config.name} API Failed (${response.status}):`, errorBody);
          throw new Error(`Status ${response.status}`);
        }

        const data: any = await response.json();
        return new Response(JSON.stringify(data), { 
            headers: { 'Content-Type': 'application/json' } 
        });

      } catch (error) {
        console.error(`${config.name} error:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
        continue;
      }
    }

    return new Response(JSON.stringify({ error: `All APIs failed: ${lastError?.message}` }), { status: 502 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
