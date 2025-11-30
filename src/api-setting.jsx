import { useState, useEffect } from "react";
import {
  getStore
} from "./store";
// api配置表单
function ApiSetting(props) {
  const [apiKey, setApiKey] = useState("");
  const [securityKey, setSecurityKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 加载保存的API Key
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    try {
      const savedKey = await getStore().get("amap_api_key");
      const savedSecurityKey = await getStore().get("amap_security_key");
      
      if (savedKey) {
        setApiKey(savedKey);
      }
      if (savedSecurityKey) {
        setSecurityKey(savedSecurityKey);
      }
      
      if (savedKey) {
      }
    } catch (error) {
      console.error('加载API Key失败:', error);
    }
  };

  const validateKey = (key) => {
    // 高德地图API Key格式验证
    const apiKeyPattern = /^[a-zA-Z0-9]{32}$/;
    return apiKeyPattern.test(key);
  };

  const handleSave = async () => {
    if (!validateKey(apiKey)) {
      setErrorMessage("请输入有效的32位API Key");
      return;
    }
    if (!validateKey(securityKey)) {
      setErrorMessage("请输入有效的32位安全密钥");
      
      return;
    }
    setIsSaving(true);
    try {
      await getStore().set("amap_api_key", apiKey);
      await getStore().set("amap_security_key", securityKey);
      
      props.onStatus(apiKey, securityKey);
    } catch (error) {
      console.error('保存API Key失败:', error);
      
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="p-8 bg-white rounded-xl border border-gray-200 shadow-lg">
      <div className="text-center mb-6">
        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 mb-1">
          需要高德地图key和安全密钥才能使用地图功能
        </p>
        <p className="text-xs text-gray-500">
          前往 <a href="https://console.amap.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-medium">高德开放平台</a> 获取免费 API Key
        </p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Key
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
            }}
            placeholder="请输入32位API Key"
            className={`w-full px-4 py-3 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors border-gray-300 focus:ring-gray-500 focus:border-gray-400`}
          />
          
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            安全密钥
          </label>
          <input
            type="text"
            value={securityKey}
            onChange={(e) => {
              setSecurityKey(e.target.value);
            }}
            placeholder="请输入安全密钥"
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-400 transition-colors"
          />
        </div>
        <div>
          {errorMessage && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {errorMessage}
            </p>
          )}
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!apiKey || isSaving}
            className={`flex-1 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
              !apiKey || !securityKey || isSaving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500'
            }`}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
   
        </div>
      </div>
    </div>
  );
}

export default ApiSetting;