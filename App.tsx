
import React, { useState, useEffect } from 'react';
import { md5, generateRandomEmail, generateRandomPassword } from './lib/crypto';
import { GeneratedAccount, GameState } from './types';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { 
  Play, 
  Copy, 
  Loader, 
  LogOut, 
  Lock, 
  Mail, 
  Zap, 
  Trophy,
  RotateCcw,
  Check
} from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <Loader className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans dir-rtl" dir="rtl">
      {!session ? <AuthScreen /> : <MachineApp session={session} />}
    </div>
  );
};

// --- Auth Screen ---
const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'SIGNUP') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('تم إنشاء الحساب بنجاح!');
        setMode('LOGIN');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      let msg = err.message || "خطأ غير متوقع";
      if (msg.includes("Invalid login")) msg = "بيانات الدخول غير صحيحة";
      if (msg.includes("Email not confirmed")) msg = "البريد غير مفعل. قم بتعطيل Confirm Email من إعدادات Supabase";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
        <h1 className="text-3xl font-bold text-emerald-500 mb-6 text-center">الماكينة الذكية</h1>
        {error && <div className="bg-red-900/50 text-red-200 p-3 rounded mb-4 text-sm text-center">{error}</div>}
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-700 p-3 rounded text-white" placeholder="البريد الإلكتروني" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-700 p-3 rounded text-white" placeholder="كلمة المرور" required />
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded transition-colors">
            {loading ? <Loader className="animate-spin mx-auto" /> : (mode === 'LOGIN' ? 'دخول' : 'تسجيل جديد')}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-400 text-sm cursor-pointer hover:text-white" onClick={() => setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}>
          {mode === 'LOGIN' ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب؟ سجل الدخول'}
        </p>
      </div>
    </div>
  );
};

// --- Main Machine Logic ---
const MachineApp: React.FC<{ session: Session }> = ({ session }) => {
  const [accounts, setAccounts] = useState<GeneratedAccount[]>([]);
  const [gameState, setGameState] = useState<GameState>({ user_id: session.user.id, current_index: 0, current_level: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [targetCount, setTargetCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load Data on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch Accounts
        const { data: accData, error: accError } = await supabase
          .from('generated_accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });
        
        if (accError) {
          console.error("Account Fetch Error:", accError);
          // Don't alert here to avoid spamming if table is empty
        }
        if (accData) setAccounts(accData);

        // 2. Fetch Game State
        const { data: stateData, error: stateError } = await supabase
          .from('game_state')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle(); // Use maybeSingle to avoid error on empty

        if (stateData) {
          setGameState(stateData);
        } else {
          // Attempt to create initial state safely
          const { error: initError } = await supabase.from('game_state').upsert({
            user_id: session.user.id,
            current_index: 0,
            current_level: 1
          });
          if (initError) console.error("Init State Error:", initError);
        }
      } catch (e) {
        console.error("General Load Error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [session.user.id]);

  // Generate Accounts Logic
  const handleGenerate = async () => {
    setIsGenerating(true);
    const newAccounts: any[] = [];
    
    // Generate locally first
    for(let i=0; i<targetCount; i++) {
      const plain = generateRandomPassword();
      newAccounts.push({
        user_id: session.user.id,
        email: generateRandomEmail(),
        password_plain: plain,
        password_md5: md5(plain),
        created_at: new Date().toISOString(),
        status: 'ready' // Add status field as it might be required by DB
      });
    }

    // Bulk Insert to Supabase
    const { data, error } = await supabase
      .from('generated_accounts')
      .insert(newAccounts)
      .select();

    if (error) {
      alert(`فشل التوليد: ${error.message}`);
      console.error(error);
    } else if (data) {
      setAccounts(prev => [...prev, ...data]);
      // Reset game if it was empty
      if (accounts.length === 0) {
        updateGameState(0, 1);
      }
    }
    setIsGenerating(false);
  };

  // The Big Button Click Logic
  const handleNext = async () => {
    if (accounts.length === 0) return;

    let nextIndex = gameState.current_index + 1;
    let nextLevel = gameState.current_level;

    // Loop Logic
    if (nextIndex >= accounts.length) {
      nextIndex = 0;
      nextLevel += 1;
    }

    // Optimistic Update (UI updates instantly)
    setGameState({ ...gameState, current_index: nextIndex, current_level: nextLevel });

    // Background Save
    await supabase.from('game_state').upsert({
      user_id: session.user.id,
      current_index: nextIndex,
      current_level: nextLevel,
      updated_at: new Date().toISOString()
    });
  };

  const updateGameState = async (idx: number, lvl: number) => {
    setGameState({ ...gameState, current_index: idx, current_level: lvl });
    await supabase.from('game_state').upsert({
      user_id: session.user.id,
      current_index: idx,
      current_level: lvl
    });
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleReset = async () => {
    if(confirm("هل أنت متأكد؟ سيتم حذف جميع الحسابات والعودة للمستوى 1.")) {
      const { error } = await supabase.from('generated_accounts').delete().eq('user_id', session.user.id);
      if (error) {
        alert("فشل الحذف: " + error.message);
        return;
      }
      await updateGameState(0, 1);
      setAccounts([]);
    }
  };

  // --- Views ---

  if (isLoading) return <div className="flex h-screen items-center justify-center text-white flex-col gap-4"><Loader className="animate-spin text-emerald-500" size={48} /><p>جاري تحميل الماكينة...</p></div>;

  // View 1: Generator (If no accounts)
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full">
          <Zap size={48} className="text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">الماكينة فارغة</h2>
          <p className="text-gray-400 mb-6">قم بتوليد الحسابات للبدء في اللعبة</p>
          
          <div className="flex gap-2 mb-4 justify-center">
            <input 
              type="number" 
              value={targetCount} 
              onChange={e => setTargetCount(Number(e.target.value))}
              className="bg-gray-900 border border-gray-600 rounded px-4 py-2 text-white w-24 text-center font-bold text-lg"
            />
            <span className="self-center text-gray-400">حساب</span>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader className="animate-spin" /> : <><Play fill="currentColor" /> بدء التوليد</>}
          </button>
          
          <button onClick={() => supabase.auth.signOut()} className="mt-6 text-red-400 text-sm hover:underline flex items-center justify-center gap-1">
            <LogOut size={14} /> تسجيل خروج
          </button>
        </div>
      </div>
    );
  }

  // View 2: The Machine (Game)
  const currentAccount = accounts[gameState.current_index] || accounts[0];
  const isMaxLevel = gameState.current_level > 10;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 p-4 relative overflow-hidden">
      {/* Top Bar */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 p-2 z-10">
        <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
           <Trophy className="text-yellow-500" size={16} />
           <span className="font-bold text-yellow-500">مستوى {gameState.current_level}</span>
           <span className="text-gray-500 text-xs">/ 10</span>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-gray-500 hover:text-white">
          <LogOut size={20} />
        </button>
      </div>

      {isMaxLevel ? (
        <div className="text-center mt-20 p-8 bg-gray-800 rounded-2xl border-2 border-yellow-500 animate-pulse z-10">
           <Trophy size={64} className="text-yellow-400 mx-auto mb-4" />
           <h1 className="text-3xl font-bold text-white mb-2">🎉 تهانينا! 🎉</h1>
           <p className="text-yellow-200 mb-6">لقد أنهيت التحدي ووصلت للمستوى 10!</p>
           <button onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold">
             إعادة ضبط الماكينة
           </button>
        </div>
      ) : (
        <>
          {/* Account Card */}
          <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl mb-8 relative z-10">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-900 px-4 py-1 rounded-full border border-gray-700 text-xs text-gray-400">
               حساب رقم {gameState.current_index + 1} من {accounts.length}
            </div>

            {/* Email Field */}
            <div className="mb-4">
              <label className="text-xs text-emerald-400 mb-1 block flex items-center gap-1">
                <Mail size={12} /> البريد الإلكتروني
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-900 p-3 rounded-lg border border-gray-700 font-mono text-sm truncate text-left text-white" dir="ltr">
                  {currentAccount?.email}
                </div>
                <button 
                  onClick={() => copyToClipboard(currentAccount?.email, 'email')}
                  className={`p-3 rounded-lg transition-colors ${copiedField === 'email' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {copiedField === 'email' ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-xs text-blue-400 mb-1 block flex items-center gap-1">
                <Lock size={12} /> كلمة المرور
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-900 p-3 rounded-lg border border-gray-700 font-mono text-sm truncate text-left text-white" dir="ltr">
                  {currentAccount?.password_plain}
                </div>
                <button 
                  onClick={() => copyToClipboard(currentAccount?.password_plain, 'pass')}
                  className={`p-3 rounded-lg transition-colors ${copiedField === 'pass' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {copiedField === 'pass' ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </div>

          {/* The Big Button */}
          <div className="relative z-0">
             {/* Glow Effect */}
             <div className="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
             
             <button 
                onClick={handleNext}
                className="relative w-64 h-64 rounded-full bg-gradient-to-b from-gray-700 to-gray-900 border-8 border-gray-800 shadow-[0_10px_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center group active:scale-95 transition-all duration-150"
             >
                {/* Inner Ring */}
                <div className="absolute inset-2 rounded-full border-2 border-gray-600/50"></div>
                
                {/* Content */}
                <span className="text-6xl font-black text-white drop-shadow-lg font-mono">
                  {gameState.current_index + 1}
                </span>
                <span className="text-emerald-500 text-sm mt-2 font-bold uppercase tracking-widest group-hover:text-emerald-400">
                  اضغط للتالي
                </span>
             </button>
          </div>

          {/* Reset Button (Small) */}
          <button 
            onClick={handleReset}
            className="mt-12 text-gray-600 hover:text-red-400 flex items-center gap-1 text-xs transition-colors"
          >
            <RotateCcw size={12} /> تصفير الماكينة
          </button>
        </>
      )}
    </div>
  );
};

export default App;
