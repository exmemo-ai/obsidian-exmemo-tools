import { Notice, requestUrl } from 'obsidian';
import OpenAI from "openai";
import { ExMemoSettings } from "./settings";
import { t } from "./lang/helpers";

export async function callWithOpenAISDK(req: string, settings: ExMemoSettings): Promise<string> {
    let ret = '';
    //console.log('callLLM:', req.length, 'chars', req);
    //console.warn('callLLM:', settings.llmBaseUrl, settings.llmToken);
    const openai = new OpenAI({
        apiKey: settings.llmToken,
        baseURL: settings.llmBaseUrl,
        dangerouslyAllowBrowser: true
    });
    try {
        const completion = await openai.chat.completions.create({
            model: settings.llmModelName,
            messages: [
                { "role": "user", "content": req }
            ]
        });
        if (completion.choices.length > 0) {
            ret = completion.choices[0].message['content'] || ret;
        }
        //console.log('LLM:', completion.usage)
    } catch (error) {
        console.warn('Error:', error as string);
        throw error; // Propagate error upwards, let callLLM handle it
    }
    return ret;
}

export async function callWithGoogleAPI(req: string, settings: ExMemoSettings): Promise<string> {
    let ret = '';
    let apiUrl = settings.llmBaseUrl || 'https://generativelanguage.googleapis.com';
    
    if (apiUrl.endsWith('/')) {
        apiUrl = apiUrl.substring(0, apiUrl.length - 1);
    }
    
    if (!apiUrl.includes('/v1beta')) {
        apiUrl += '/v1beta';
    }
    
    apiUrl += `/models/${settings.llmModelName}:generateContent?key=${settings.llmToken}`;
    //console.log('Google API URL:', apiUrl);
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    const requestBody = {
        contents: [
            { 
                parts: [
                    { text: req }
                ]
            }
        ]
    };
    
    //console.log('Using Obsidian requestUrl API to bypass CORS');
    const response = await requestUrl({
        url: apiUrl,
        method: 'POST',
        headers: headers,
        contentType: 'application/json',
        body: JSON.stringify(requestBody),
        throw: true
    });
    
    //console.log('Google API response:', response);
    
    if (response.status >= 200 && response.status < 300 && response.json) {
        const data = response.json;
        
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && data.candidates[0].content.parts) {
            ret = data.candidates[0].content.parts[0].text || '';
        }
    }
    
    return ret;
}

export async function callLLM(req: string, settings: ExMemoSettings, showNotice: boolean = true): Promise<string> {
    let ret = '';
    let info = null;
    if (showNotice) {
        info = new Notice(t("llmLoading"), 0);
    }
    
    try {
        const isGoogle = settings.llmBaseUrl?.includes('googleapis.com');
        
        if (!isGoogle) {
            //console.log('Using direct SDK call for non-Google API');
            ret = await callWithOpenAISDK(req, settings);
            return ret;
        }
        
        try {
            ret = await callWithGoogleAPI(req, settings);
            if (ret) {
                //console.log('Successfully received response from Google API');
                return ret;
            }
        } catch (requestError) {
            console.warn('requestUrl failed:', requestError);
        }
        
        //console.log('Trying SDK as fallback');
        try {
            ret = await callWithOpenAISDK(req, settings);
            if (ret) {
                //console.log('Successfully used OpenAI SDK for Google API');
                return ret;
            }
        } catch (sdkError) {
            console.warn('OpenAI SDK failed for Google API:', sdkError);
        }
        
        if (!ret) {
            throw new Error('All Google API request methods failed');
        }
    } catch (error) {
        console.warn('Error in callLLM:', error);
        if (showNotice) {
            new Notice(t("llmError") + "\n" + (error instanceof Error ? error.message : String(error)));
        }
    } finally {
        if (info) {
            info.hide();
        }
    }
    
    return ret;
}

/**
 * Test if LLM connection is working properly
 * @param settings Plugin settings
 * @returns Object containing success status and error message
 */
export async function testLlmConnection(settings: ExMemoSettings): Promise<{ success: boolean, error?: string }> {
    try {
        if (!settings.llmToken) {
            return { success: false, error: t("apiKeyEmpty") };
        }
        
        if (!settings.llmModelName) {
            return { success: false, error: t("modelNameEmpty") };
        }
        
        // Use callLLM directly for testing, so we use the same logic for API calls
        const testPrompt = t("connectionTestPrompt");
        const response = await callLLM(testPrompt, settings, false); // Don't show notification to avoid duplicate alerts
        
        if (response) {
            return { success: true };
        } else {
            return { success: false, error: t("apiResponseEmpty") };
        }
    } catch (error) {
        console.error("LLM connection test error:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

