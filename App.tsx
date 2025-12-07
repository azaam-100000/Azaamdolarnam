
import React, { useState, useEffect, useRef } from 'react';
import { md5, generateRandomEmail, generateRandomPassword } from './lib/crypto';
import { GeneratedAccount, RegistrationPayload } from './types';
import { 
  Play, 
  Trash2, 
  Copy, 
  Download, 
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Save
} from 'lucide-react';

const App: React.FC = () => {
  const [targetCount, setTargetCount] = useState<number>(10);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<GeneratedAccount[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const shouldStopRef = useRef<boolean>(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('z_autoreg_accounts');
    if (saved) {
      try {
        setAccounts(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved accounts", e);
      }
    }
  }, []);

  // Save to local storage whenever accounts change
  useEffect(() => {
    localStorage.setItem('z_autoreg_accounts', JSON.stringify(accounts));
  }, [accounts]);

  // Statistics
  const total = accounts.length;
  const success = accounts.filter(a => a.status === 'SUCCESS').length;
  const failed = accounts.filter(a => a.status === 'ERROR').length;

  const startGeneration = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    shouldStopRef.current = false;
    setProgress(0);

    for (let i = 0; i < targetCount; i++) {
      if (shouldStopRef.current) break;

      const email = generateRandomEmail();
      const passwordPlain = generateRandomPassword();
      const passwordMd5 = md5(passwordPlain);
      
      const newAccount: GeneratedAccount = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(),
        email,
        passwordPlain,
        passwordMd5,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      setAccounts(prev => [newAccount, ...prev]);

      try {
        await registerAccount(newAccount);
        setAccounts(prev => prev.map(acc => 
          acc.id === newAccount.id ? { ...acc, status: 'SUCCESS' } : acc
        ));
      } catch (error) {
        console.error("Registration failed", error);
        setAccounts(prev => prev.map(acc => 
          acc.id === newAccount.id ? { ...acc, status: 'ERROR', errorMessage: (error as Error).message } : acc
        ));
      }

      setProgress(Math.round(((i + 1) / targetCount) * 100));
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const stopGeneration = () => {
    shouldStopRef.current = true;
    setIsRunning(false);
  };

  const registerAccount = async (account: GeneratedAccount) => {
    const url = "https://api.zaminer.cc/api/user/register?lang=ar";
    
    const payload: RegistrationPayload = {
      account: account.email,
      pwd: account.passwordMd5,
      user_type: 1,
      user_email: account.email,
      code: "kyr5ib",
      captcha: "",
      telegram: "",
      whatsapp: ""
    };

    try {
        const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Note: Browsers may block these headers.
            // 'Origin': 'https://zaminer.cc',
            // 'Referer': 'https://zaminer.cc/',
            // 'User-Agent': 'Mozilla/5.0 (Linux; Android) Chrome/139 Mobile Safari/537.36'
        },
        body: JSON.stringify(payload)
        });

        if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        if (data && typeof data.code === 'number' && data.code !== 200 && data.code !== 0) {
             // throw new Error(data.msg || "API Error");
        }
    } catch (e) {
        // Allow cross-origin failure to pass as "Attempted" in simulation if strict mode isn't required,
        // but user wants exact match. 
        // We throw to mark as ERROR in UI.
        throw e;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const clearAll = () => {
    if(confirm('هل أنت متأكد من حذف كل الحسابات؟')) {
        setAccounts([]);
        localStorage.removeItem('z_autoreg_accounts');
    }
  }

  const exportTxt = () => {
    const content = accounts.map(a => `${a.email}:${a.passwordPlain}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-${new Date().getTime()}.txt`;
    a.click();
  };

  const exportCsv = () => {
    const header = "Email,Password,MD5,Created At,Status\n";
    const content = accounts.map(a => 
      `${a.email},${a.passwordPlain},${a.passwordMd5},${a.createdAt},${a.status}`
    ).join('\n');
    const blob = new Blob([header + content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts-${new Date().getTime()}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-dark text-gray-100 font-sans p-2 md:p-6 max-w-5xl mx-auto">
      <header className="mb-6 text-center md:text-right">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Z-AutoReg Bot</h1>
        <p className="text-gray-400 text-sm">مولد حسابات تلقائي - Android Emulation</p>
      </header>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-surface p-4 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-secondary flex items-center gap-2">
            <Play size={20} />
            التحكم في التوليد
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">عدد الحسابات</label>
              <input 
                type="number" 
                value={targetCount}
                onChange={(e) => setTargetCount(parseInt(e.target.value) || 0)}
                className="w-full bg-dark border border-gray-600 rounded-lg p-3 text-white focus:border-primary outline-none"
                placeholder="مثلاً 100"
                min="1"
                disabled={isRunning}
              />
            </div>

            <div className="flex gap-3">
              {!isRunning ? (
                <button 
                  onClick={startGeneration}
                  className="flex-1 bg-primary hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                  <Play size={18} fill="currentColor" />
                  بدء التوليد
                </button>
              ) : (
                <button 
                  onClick={stopGeneration}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                  <XCircle size={18} />
                  إيقاف
                </button>
              )}
            </div>

            {isRunning && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>التقدم</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-surface p-4 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-secondary flex items-center gap-2">
                <FileText size={20} />
                الإحصائيات
            </h2>
             {accounts.length > 0 && (
                <button onClick={clearAll} className="text-red-400 text-xs hover:text-red-300 flex items-center gap-1">
                    <Trash2 size={12}/> مسح الكل
                </button>
             )}
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center h-full items-center mb-4">
            <div className="bg-dark/50 p-3 rounded-lg border border-gray-700">
              <span className="block text-2xl font-bold text-white">{total}</span>
              <span className="text-xs text-gray-400">الإجمالي</span>
            </div>
            <div className="bg-dark/50 p-3 rounded-lg border border-green-900/30">
              <span className="block text-2xl font-bold text-green-400">{success}</span>
              <span className="text-xs text-gray-400">ناجح</span>
            </div>
            <div className="bg-dark/50 p-3 rounded-lg border border-red-900/30">
              <span className="block text-2xl font-bold text-red-400">{failed}</span>
              <span className="text-xs text-gray-400">فشل</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={exportTxt} 
              disabled={accounts.length === 0}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 rounded-lg text-sm flex justify-center items-center gap-2 transition-colors"
            >
              <Download size={16} />
              TXT
            </button>
            <button 
              onClick={exportCsv}
              disabled={accounts.length === 0}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white py-2 px-3 rounded-lg text-sm flex justify-center items-center gap-2 transition-colors"
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Account List */}
      <div className="bg-surface rounded-xl border border-gray-700 shadow-lg flex flex-col h-[500px]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-secondary">سجل الحسابات</h2>
          <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 flex items-center gap-1">
             <Save size={10} /> حفظ تلقائي
          </span>
        </div>
        
        {/* Scrollable Container */}
        <div className="flex-1 overflow-auto relative w-full">
            {accounts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 p-8">
                    <div className="bg-dark p-4 rounded-full">
                        <Play size={32} className="opacity-20" />
                    </div>
                    <p>لا توجد حسابات بعد. اضغط "بدء التوليد"</p>
                </div>
            ) : (
                <table className="w-full text-right min-w-[600px]"> {/* min-w forces scroll on small screens */}
                    <thead className="bg-dark text-gray-400 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 font-medium text-right">البريد الإلكتروني</th>
                            <th className="px-4 py-3 font-medium text-right">كلمة المرور</th>
                            <th className="px-4 py-3 font-medium text-right">MD5</th>
                            <th className="px-4 py-3 font-medium text-center">الحالة</th>
                            <th className="px-4 py-3 font-medium text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {accounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-gray-700/50 transition-colors text-sm">
                            <td className="px-4 py-3 font-mono text-gray-300">{acc.email}</td>
                            <td className="px-4 py-3 font-mono text-emerald-400">{acc.passwordPlain}</td>
                            <td className="px-4 py-3 font-mono text-gray-500 text-xs max-w-[100px] truncate" title={acc.passwordMd5}>
                                {acc.passwordMd5}
                            </td>
                            <td className="px-4 py-3 text-center">
                            {acc.status === 'PENDING' && (
                                <span className="inline-flex items-center gap-1 text-yellow-500 text-xs bg-yellow-500/10 px-2 py-1 rounded-full whitespace-nowrap">
                                <Loader size={12} className="animate-spin" /> جاري
                                </span>
                            )}
                            {acc.status === 'SUCCESS' && (
                                <span className="inline-flex items-center gap-1 text-green-500 text-xs bg-green-500/10 px-2 py-1 rounded-full whitespace-nowrap">
                                <CheckCircle size={12} /> تم
                                </span>
                            )}
                            {acc.status === 'ERROR' && (
                                <span className="inline-flex items-center gap-1 text-red-500 text-xs bg-red-500/10 px-2 py-1 rounded-full whitespace-nowrap" title={acc.errorMessage}>
                                <AlertTriangle size={12} /> خطأ
                                </span>
                            )}
                            </td>
                            <td className="px-4 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                                <button 
                                onClick={() => copyToClipboard(`${acc.email}:${acc.passwordPlain}`)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                                title="نسخ"
                                >
                                <Copy size={16} />
                                </button>
                                <button 
                                onClick={() => deleteAccount(acc.id)}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                                title="حذف"
                                >
                                <Trash2 size={16} />
                                </button>
                            </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;
