
import React, { useState } from 'react';
import { AppSection } from './types';
import HomeView from './views/HomeView';
import TryOnView from './views/TryOnView';
import HairstyleView from './views/HairstyleView';
import AnalysisView from './views/AnalysisView';
import CalendarView from './views/CalendarView';
import CoupleFaceView from './views/CoupleFaceView';
import FengShuiView from './views/FengShuiView';

const App: React.FC = () => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.HOME);

  const renderSection = () => {
    switch (currentSection) {
      case AppSection.HOME:
        return <HomeView onNavigate={setCurrentSection} />;
      
      case AppSection.TRY_ON_CLOTHES:
        return <TryOnView type="clothes" onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.TRY_ON_ACCESSORIES:
        return <TryOnView type="accessories" onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.HAIRSTYLE:
        return <HairstyleView onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.BEAUTY_SCORE:
        return <AnalysisView title="颜值打分" type="颜值打分" onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.COUPLE_FACE:
        return <CoupleFaceView onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.TONGUE_DIAGNOSIS:
        return <AnalysisView title="趣味舌诊" type="舌诊" onBack={() => setCurrentSection(AppSection.HOME)} helpText="请上传一张清晰的舌头照片哦～" />;
      
      case AppSection.FACE_COLOR:
        return <AnalysisView title="面色分析" type="中医面色" onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.FACE_READING:
        return <AnalysisView title="传统面相" type="传统相术" onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.FENG_SHUI:
        return <FengShuiView onBack={() => setCurrentSection(AppSection.HOME)} />;
      
      case AppSection.CALENDAR:
        return <CalendarView onBack={() => setCurrentSection(AppSection.HOME)} />;

      default:
        return <HomeView onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto relative overflow-hidden bg-pink-50 flex flex-col shadow-2xl">
      <div className="flex-1 overflow-y-auto pb-20">
        {renderSection()}
      </div>
      
      {/* Tab Bar - Optional if Home is enough, but nice for UX */}
      {currentSection !== AppSection.HOME && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-white/80 backdrop-blur-md border-t flex justify-around items-center px-4 z-50">
          <button 
            onClick={() => setCurrentSection(AppSection.HOME)}
            className="flex flex-col items-center gap-1 text-gray-500 hover:text-pink-500 transition-colors"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs">首页</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
