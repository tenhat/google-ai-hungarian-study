import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Word } from '../types';
import { useWordBank } from '../hooks/useWordBank';
import { Play, Pause, SkipForward, SkipBack, X, Headphones, Volume2, RotateCw } from 'lucide-react';

interface ListeningModeProps {
  // onBack: () => void; // App.tsx handles view switching, usually we pass setCurrentView or similar if needed, 
                        // but here we might just rely on internal state or standard navigation if passed.
                        // However, App.tsx renders this based on enum. Let's start without props if not strictly needed for logic,
                        // assuming global navigation handles exit? 
                        // Actually App.tsx passes nothing to pages usually, but Home passes setCurrentView.
                        // Let's assume we might need a way to go back home. 
                        // But looking at App.tsx, the bottom nav is always there. 
                        // "X" button usually implies going back to Home.
                        // So we should probably accept setCurrentView like other components if they need it.
                        // Checking App.tsx, only Home receives setCurrentView. Others don't seem to receive it in the switch case.
                        // Wait, they don't? 
                        // App.tsx: 
                        // case View.Quiz: return <Quiz />;
                        // So Quiz has its own internal "Back/Exit" or relies on Bottom Nav?
                        // Quiz has "Home" icon in header? No, App.tsx has a global Header and Bottom Nav.
                        // Ah, Header is outside main. 
                        // So we don't strictly *need* a close button if the Bottom Nav is there, 
                        // but a "Quit" button is nice UX for a "Mode".
                        // Let's check Quiz.tsx to see how it handles exit. 
                        // It probably doesn't have one, or uses internal state.
                        // I'll add a simple header within the component or rely on main layout.
                        // Let's add an "Back to Home" button inside the key view.
}

const ListeningMode: React.FC = () => {
    // Nav hack: we need to change view. But App.tsx doesn't pass it. 
    // Maybe we just use the bottom nav? 
    // But usually "Modes" fill the screen. 
    // If I want to add a close button, I might need context or prop. 
    // For now, I'll assume users use Bottom Nav "Home" to exit, or I can add a button that just says "Finish" 
    // but I can't actually change the View without the setter.
    // Actually, looking at Home.tsx: `const Home: React.FC<HomeProps> = ({ setCurrentView }) => {`
    // App.tsx `return <Home setCurrentView={handleViewChange} />;`
    // So Home gets it. Quiz, Chat, etc don't.
    // I will follow the pattern of Quiz/Chat and not expect props, relying on Bottom Nav for navigation.
    
    const { getWordsForReviewChallenge } = useWordBank();
    const [words, setWords] = useState<Word[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [currentLang, setCurrentLang] = useState<'hu1' | 'jp' | 'hu2' | 'waiting'>('waiting');
    
    // Refs for speech and timeout to handle cleanup
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        const learningWords = getWordsForReviewChallenge();
        setWords(learningWords);
        return () => {
            mountedRef.current = false;
            stopPlayback();
        };
    }, [getWordsForReviewChallenge]);

    const stopPlayback = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const playText = (text: string, lang: 'hu-HU' | 'ja-JP', onEnd: () => void) => {
        if (!mountedRef.current) return;
        
        // Cancel previous
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = playbackRate;

        // Voice selection (simplified, prioritizing Google voices if available)
        const voices = synthRef.current.getVoices();
        if (lang === 'hu-HU') {
             // Try to find a Hungarian voice
             const huVoice = voices.find(v => v.lang.includes('hu') || v.lang.includes('HU'));
             if (huVoice) utterance.voice = huVoice;
        }

        utterance.onend = () => {
             if (mountedRef.current) onEnd();
        };
        
        utterance.onerror = (e) => {
             console.error("Speech error", e);
             // Proceed anyway to avoid getting stuck
             if (mountedRef.current) onEnd();
        };

        utteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    };

    const processSequence = useCallback(async () => {
        if (!words[currentIndex] || !isPlaying) return;
        const word = words[currentIndex];

        // Step 1: Hungarian 1
        setCurrentLang('hu1');
        playText(word.hungarian, 'hu-HU', () => {
            if (!isPlaying || !mountedRef.current) return;
            
            // Wait 1s
            timeoutRef.current = setTimeout(() => {
                // Step 2: Japanese
                setCurrentLang('jp');
                playText(word.japanese, 'ja-JP', () => {
                    if (!isPlaying || !mountedRef.current) return;

                    // Wait 1s
                    timeoutRef.current = setTimeout(() => {
                        // Step 3: Hungarian 2
                        setCurrentLang('hu2');
                        playText(word.hungarian, 'hu-HU', () => {
                            if (!isPlaying || !mountedRef.current) return;

                            // Wait 2s then next
                            setCurrentLang('waiting');
                            timeoutRef.current = setTimeout(() => {
                                nextWord();
                            }, 2000); // 2 seconds delay before next word
                        });
                    }, 1000);
                });
            }, 1000);
        });
    }, [currentIndex, words, isPlaying, playbackRate]);

    // Triggers the sequence when isPlaying or currentIndex changes, 
    // but we need to be careful not to trigger double loops.
    // Best way: use an effect that watches `currentIndex` and `isPlaying`.
    // But `processSequence` is complex. 
    // Let's separate the "start" logic.

    const startSequenceRef = useRef<() => void>(null);
    
    // Using a ref to hold the latest function to avoid stale closures in timeouts if we simply called it,
    // but here the recursion is driven by callbacks.
    // Actually, simple useEffect watching `currentIndex` is risky if we also have `isPlaying` logic separate.
    
    // Let's use a persistent effect for the "Driver".
    useEffect(() => {
        if (isPlaying && words.length > 0) {
            processSequence();
        } else {
            stopPlayback();
        }
        // Cleanup on effect re-run (e.g. if index changes, we stop previous and start new)
        return () => {
            stopPlayback();
        };
    }, [currentIndex, isPlaying, /* words, playbackRate - if these change we restart sequence for current word */]); 
    // Note: if playbackRate changes mid-word, it might arguably be better to wait for next, 
    // but restarting current word is also acceptable and simpler.

    const nextWord = () => {
        setCurrentIndex(prev => {
            const next = prev + 1;
            if (next >= words.length) {
                setIsPlaying(false); // Stop at end
                return 0; // Reset to start
            }
            return next;
        });
    };

    const prevWord = () => {
        setCurrentIndex(prev => Math.max(0, prev - 1));
    };

    const togglePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const handleSpeedChange = () => {
        setPlaybackRate(prev => {
            if (prev === 1.0) return 1.2;
            if (prev === 1.2) return 0.8;
            return 1.0;
        });
    };
    
    // Handle unmount / mounting check
    useEffect(() => {
        return () => {
            stopPlayback(); 
        };
    }, []);

    if (words.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center p-8 space-y-4 h-[60vh]">
                <div className="bg-slate-100 p-6 rounded-full">
                    <Headphones size={48} className="text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-700">学習中の単語がありません</h2>
                <p className="text-slate-500 text-center">
                    まだ学習中（Learning）ステータスの単語がありません。<br/>
                    クイズやチャットで学習を進めましょう！
                </p>
             </div>
        );
    }

    const currentWord = words[currentIndex];

    return (
        <div className="flex flex-col items-center max-w-md mx-auto w-full h-full p-4 space-y-6">
            <div className="w-full flex justify-between items-center text-slate-500 mb-4">
               <div className="flex items-center gap-2">
                   <Headphones size={20} />
                   <span className="font-semibold text-sm">聞き流しモード</span>
               </div>
               <div className="text-sm font-mono bg-slate-100 px-2 py-1 rounded">
                   {currentIndex + 1} / {words.length}
               </div>
            </div>

            {/* Main Card */}
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden min-h-[300px] flex flex-col relative border border-slate-100">
                {/* Visual Indicator for Speech */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 transition-opacity duration-300 ${isPlaying && currentLang !== 'waiting' ? 'opacity-100' : 'opacity-0'}`} />
                
                <div className="flex-grow flex flex-col items-center justify-center p-8 space-y-8">
                    
                    {/* Hungarian */}
                    <div className={`text-center transition-all duration-500 ${currentLang === 'hu1' || currentLang === 'hu2' ? 'scale-110' : 'scale-100 opacity-60'}`}>
                        <h2 className="text-4xl font-bold text-slate-800 mb-2">{currentWord.hungarian}</h2>
                        {currentLang === 'hu1' && <span className="text-blue-500 text-sm font-medium animate-pulse">読み上げ中...</span>}
                        {currentLang === 'hu2' && <span className="text-indigo-500 text-sm font-medium animate-pulse">リピート</span>}
                    </div>

                    {/* Divider */}
                    <div className="w-16 h-1 bg-slate-100 rounded-full" />

                    {/* Japanese */}
                    <div className={`text-center transition-all duration-500 ${currentLang === 'jp' ? 'scale-110' : 'scale-100 opacity-60'}`}>
                         <p className="text-2xl font-medium text-slate-600">{currentWord.japanese}</p>
                         {currentLang === 'jp' && <span className="text-pink-500 text-sm font-medium animate-pulse">翻訳</span>}
                    </div>

                </div>

                {/* Progress Bar for Word Interval (Simulated visual only for now, or just static) */}
                <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-center">
                     <span className="text-xs text-slate-400 font-medium">
                        {currentLang === 'hu1' && "Hungarian"}
                        {currentLang === 'hu2' && "Hungarian (Repeat)"}
                        {currentLang === 'jp' && "Japanese"}
                        {currentLang === 'waiting' && "Next..."}
                     </span>
                </div>
            </div>

            {/* Controls */}
            <div className="w-full bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col space-y-6">
                
                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-8">
                    <button 
                        onClick={prevWord}
                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        disabled={currentIndex === 0}
                    >
                        <SkipBack size={28} />
                    </button>

                    <button 
                        onClick={togglePlay}
                        className={`p-6 rounded-full shadow-lg transition-transform transform active:scale-95 flex items-center justify-center ${isPlaying ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200'}`}
                    >
                        {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                    </button>

                    <button 
                        onClick={nextWord}
                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    >
                         <SkipForward size={28} />
                    </button>
                </div>

                {/* Settings */}
                <div className="flex justify-center border-t border-slate-100 pt-4">
                     <button 
                        onClick={handleSpeedChange} 
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors text-sm font-medium"
                     >
                        <Volume2 size={16} />
                        <span>速度: {playbackRate}x</span>
                     </button>
                </div>
            </div>

            <p className="text-xs text-slate-400 text-center max-w-xs">
                自動再生: ハンガリー語 → (1秒) → 日本語 → (1秒) → ハンガリー語 → (次へ)
            </p>
        </div>
    );
};

export default ListeningMode;
