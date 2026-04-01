import React from 'react';
import { AppProvider } from './components/AppContext';
import Header from './components/Header';
import Calendar from './components/Calendar';
import Footer from './components/Footer';
import './index.css';

/**
 * App 컴포넌트: 앱의 전체 구조(레이아웃)와 공통 상태(날짜, 테마)를 정의합니다.
 */
function App() {
    return (
        <AppProvider> {/* 전역 상태를 공급해줍니다 */}
            <div className="app-container">
                <Header />
                <main className="app-main">
                    <Calendar />
                </main>
                <Footer />
            </div>
        </AppProvider>
    );
}

export default App;