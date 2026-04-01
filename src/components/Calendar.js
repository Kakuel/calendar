import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const Calendar = ({ currentDate, setCurrentDate }) => {
    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [animClass, setAnimClass] = useState("");

    // 앱 실행 시 로컬 스토리지 데이터 불러오기
    useEffect(() => {
        const savedEvents = JSON.parse(localStorage.getItem('calendar_events')) || [];
        setEvents(savedEvents);
    }, []);

    // 데이터가 변경될 때마다 자동 저장
    useEffect(() => {
        localStorage.setItem('calendar_events', JSON.stringify(events));
    }, [events]);

    // --- [일정 저장 로직 (반복 및 그룹 ID 적용)] ---
    const handleSaveEvent = (newEvent) => {
        if (editingEvent) {
            // 수정 모드: 단일 객체만 업데이트
            setEvents(events.map(evt => evt.id === editingEvent.id ? newEvent : evt));
        } else {
            let eventsToAdd = [];
            // 반복 일정을 묶기 위한 공통 그룹 ID 생성
            const groupId = `grp_${Date.now()}`;

            eventsToAdd.push({ ...newEvent, id: `evt_${Date.now()}_0`, groupId });

            if (newEvent.repeat !== 'none') {
                for (let i = 1; i <= 10; i++) {
                    const nextDate = new Date(newEvent.date);
                    if (newEvent.repeat === 'weekly') nextDate.setDate(nextDate.getDate() + (i * 7));
                    if (newEvent.repeat === 'monthly') nextDate.setMonth(nextDate.getMonth() + i);
                    if (newEvent.repeat === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + i);

                    eventsToAdd.push({
                        ...newEvent,
                        id: `evt_${Date.now()}_${i}`,
                        groupId, // 같은 그룹 ID 공유
                        date: formatLocalDate(nextDate)
                    });
                }
            }
            setEvents([...events, ...eventsToAdd]);
        }
        closeModal();
    };

    // D-Day 계산 함수
    const getDDay = (dateStr) => {
        const today = new Date();
        const target = new Date(dateStr);

        // 시간 제거 (날짜만 비교)
        today.setHours(0,0,0,0);
        target.setHours(0,0,0,0);

        const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

        if (diff === 0) return "D-Day";
        if (diff > 0) return `D-${diff}`;
        return `D+${Math.abs(diff)}`;
    };

    // Date 객체를 “한국 기준 날짜 문자열 (YYYY-MM-DD)”로 변환하는 함수
    // 한국 기준으로 안하면 날짜에 간극이 생길 수 있었음.
    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // --- [고급 삭제 로직 (단일, 이후, 전체)] ---
    const handleDeleteEvent = (eventToDelete, deleteScope) => {
        if (deleteScope === 'single') {
            // 선택한 해당 일정만 삭제
            setEvents(events.filter(evt => evt.id !== eventToDelete.id));
        } else if (deleteScope === 'future') {
            // 같은 그룹이면서, 선택한 날짜와 같거나 그 이후인 일정 모두 삭제
            setEvents(events.filter(evt => {
                const isSameGroup = evt.groupId === eventToDelete.groupId;
                const isFutureOrSameDate = evt.date >= eventToDelete.date;
                return !(isSameGroup && isFutureOrSameDate); // 해당 조건에 맞으면 필터링(제외)
            }));
        } else if (deleteScope === 'all') {
            // 같은 그룹 ID를 가진 모든 일정 삭제
            setEvents(events.filter(evt => evt.groupId !== eventToDelete.groupId));
        }
        closeModal();
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
        setSelectedDate(null);
    };

    // --- [드래그 앤 드롭] ---
    const onDragStart = (e, eventId) => e.dataTransfer.setData("eventId", eventId);
    const onDragOver = (e) => e.preventDefault();
    const onDrop = (e, targetDate) => {
        const eventId = e.dataTransfer.getData("eventId");
        setEvents(events.map(evt => evt.id === eventId ? { ...evt, date: targetDate } : evt));
    };

    // --- [달력 그리드 렌더링 로직 (42칸 고정)] ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const startDate = new Date(year, month, 1);
    startDate.setDate(1 - startDate.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + i);
        days.push({
            dateStr: formatLocalDate(cellDate),
            isCurrentMonth: cellDate.getMonth() === month,
            dayNumber: cellDate.getDate(),
            dayOfWeek: cellDate.getDay()
        });
    }

    // 달력 페이지 넘기는 함수
    const changeMonth = (offset) => {
        setAnimClass(offset > 0 ? "slide-next" : "slide-prev");
        setCurrentDate(new Date(year, month + offset, 1));
        setTimeout(() => setAnimClass(""), 300);
    };

    // 현재 달의 일정 데이터만 보여주는 함수
    // 마지막 구문은 검색어와 일치하는지까지 비교해 검색 시 해당 일정만 나오도록 만들어줌
    const currentMonthEvents = events.filter(evt => {
        const evtMonth = new Date(evt.date).getMonth();
        const evtYear = new Date(evt.date).getFullYear();
        return evtMonth === month && evtYear === year && evt.title.includes(searchQuery);
    });

    // 태그 분류 및 합산해 사이드바에 표기하는 함수
    const tagCounts = currentMonthEvents.reduce((acc, evt) => {
        acc[evt.tag] = (acc[evt.tag] || 0) + 1;
        return acc;
    }, {});

    // 이번 달 일정의 전체 수
    const totalTags = currentMonthEvents.length;

    // --- Calendar.js 내부 useEffect (알림 로직) ---
    useEffect(() => {
        // 앱 실행 시 권한 확실히 요청
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        const interval = setInterval(() => {
            const now = new Date();
            events.forEach(event => {
                if (!event.notifyBefore || event.notifyBefore === "none") return;

                const eventDateTime = new Date(`${event.date}T${event.startTime}:00`);
                const diffMinutes = Math.floor((eventDateTime - now) / 60000);

                if (diffMinutes === parseInt(event.notifyBefore)) {
                    // 브라우저 시스템 알림 발생
                    if (Notification.permission === "granted") {
                        new Notification(`⏰ [일정 알림] ${event.title}`, {
                            body: `${event.startTime} 시작 예정입니다.\n메모: ${event.memo || '없음'}`,
                            icon: '/favicon.ico' // 아이콘이 있다면 표시
                        });
                    }
                }
            });
        }, 60000);
        return () => clearInterval(interval);
    }, [events]);

    return (
        <div className="workspace">
            <div className="calendar-container">
                <div className="calendar-header">
                    <button onClick={() => changeMonth(-1)}>◀ 이전 달</button>
                    <h2>{year}년 {month + 1}월</h2>
                    <button onClick={() => changeMonth(1)}>다음 달 ▶</button>
                </div>

                <div className={`calendar-grid-wrapper ${animClass}`}>
                    <div className="calendar-grid header-row">
                        <div className="sunday">일</div>
                        <div>월</div><div>화</div><div>수</div><div>목</div><div>금</div>
                        <div className="saturday">토</div>
                    </div>

                    <div className="calendar-grid body-row">
                        {days.map((dayObj) => {
                            const dayEvents = events.filter(evt => evt.date === dayObj.dateStr && evt.title.includes(searchQuery));
                            // 날짜가 오늘인지 확인하여 강조
                            const isToday = formatLocalDate(new Date()) === dayObj.dateStr;

                            return (
                                <div
                                    key={dayObj.dateStr}
                                    className={`calendar-cell ${!dayObj.isCurrentMonth ? 'not-current' : ''} ${isToday ? 'today-cell' : ''}`}
                                    onClick={() => {
                                        setSelectedDate(dayObj.dateStr);
                                        setIsModalOpen(true);
                                    }}
                                    onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, dayObj.dateStr)}
                                >
                                  <span
                                      className={`day-number ${dayObj.dayOfWeek === 0 ? 'sunday' : dayObj.dayOfWeek === 6 ? 'saturday' : ''}`}>
                                    {dayObj.dayNumber}
                                  </span>

                                    <div className="event-dots"> {dayEvents.slice(0, 3).map((_, i) => ( <span key={i} className="dot"></span> ))} {dayEvents.length > 3 && ( <span className="dot-more">+{dayEvents.length}</span> )} </div>

                                    {/* 데스크탑 뷰 전용 일정 리스트 */}
                                    <div className="event-list">
                                        {dayEvents.map(evt => (
                                            <div
                                                key={evt.id}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, evt.id)}
                                                className="event-item"
                                                /* 수정된 부분: 배경색 로직 교체 */
                                                style={{backgroundColor: evt.color || `var(--tag-${evt.tag}, var(--tag-기본))`}}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingEvent(evt);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                <div className="event-item-content">
                                                    <span className="event-title">{evt.title}</span>
                                                    {evt.isDday && (
                                                        <span className="dday">{getDDay(evt.date)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- [모바일 전용 하단 UI 복구] --- */}
                <div className="mobile-view">
                    <h3>📱 {month + 1}월의 전체 일정</h3>
                    {currentMonthEvents.length === 0 ? (
                        <p className="empty-text">일정이 없습니다.</p>
                    ) : (
                        currentMonthEvents.map(evt => (
                            <div
                                key={evt.id}
                                className="mobile-event-card"
                                /* 수정된 부분: borderLeftColor 로직 교체 */
                                style={{ borderLeftColor: evt.color || `var(--tag-${evt.tag}, var(--tag-기본))` }}
                                onClick={() => { setEditingEvent(evt); setIsModalOpen(true); }}
                            >
                                <div className="mobile-event-date">{evt.date.substring(5)}</div>
                                <div className="mobile-event-info">
                                    <div className="event-item-content">
                                        <strong>{evt.title}</strong>
                                        <span className="dday">{getDDay(evt.date)}</span>
                                    </div>
                                    <span>{evt.startTime} ~ {evt.endTime}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <aside className="calendar-sidebar">
                <div className="sidebar-section">
                    <h3>🔍 일정 검색</h3>
                    <input
                        type="text" placeholder="검색어를 입력하세요"
                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="sidebar-section">
                    <h3>📊 {month + 1}월 태그 분포</h3>
                    {totalTags === 0 ? (
                        <p className="empty-text">이번 달 일정이 없습니다.</p>
                    ) : (
                        <div className="tag-list">
                            {Object.entries(tagCounts).map(([tag, count]) => (
                                <div key={tag} className="tag-row">
                                    <span className="tag-label" style={{ backgroundColor: `var(--tag-${tag}, var(--tag-기본))` }}>{tag}</span>
                                    <span className="tag-percent">{Math.round((count / totalTags) * 100)}% ({count}건)</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                    event={editingEvent}
                    date={selectedDate}
                    events={events}
                />
            )}
        </div>
    );
};

export default Calendar;