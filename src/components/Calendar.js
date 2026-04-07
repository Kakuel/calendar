import React, { useState, useEffect, useCallback, useMemo }from 'react';
import Modal from './Modal';
import { useApp } from './AppContext';

const Calendar = () => {
    const { currentDate, setCurrentDate, events, setEvents } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [animClass, setAnimClass] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // 기본 오늘 날짜 선택
    const [touchStart, setTouchStart] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const filteredEvents = useMemo(() => {
        if (!searchQuery.trim()) return [];
        // 선택된 날짜가 아닌, 전체 'events' 배열에서 검색
        return events.filter(evt =>
            evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (evt.memo && evt.memo.toLowerCase().includes(searchQuery.toLowerCase()))
        ).sort((a, b) => new Date(a.date) - new Date(b.date)); // 날짜순 정렬
    }, [events, searchQuery]);

    // --- [스와이프 로직] ---
    const handleTouchStart = (e) => setTouchStart(e.targetTouches[0].clientX);
    const handleTouchEnd = (e) => {
        if (!touchStart) return;
        const touchEnd = e.changedTouches[0].clientX;
        const diff = touchStart - touchEnd;

        if (diff > 70) {
            // 왼쪽으로 스와이프 (다음 달)
            changeMonth(1);
        } else if (diff < -70) {
            // 오른쪽으로 스와이프 (이전 달)
            changeMonth(-1);
        }
        setTouchStart(null);
    };

    // 달력 월 변경 함수(이전 달, 다음 달)에 애니메이션 상태를 추가합니다.
    const handlePrevMonth = () => {
        setAnimClass("slide-right");
        setTimeout(() => setAnimClass(""), 300); // 0.3초 후 클래스 제거
        // (기존의 월 감소 로직 실행)
    };

    const handleNextMonth = () => {
        setAnimClass("slide-left");
        setTimeout(() => setAnimClass(""), 300);
        // (기존의 월 증가 로직 실행)
    };

    // --- [날짜 클릭 시] ---
    const handleDateClick = (dateStr) => {
        setSelectedDate(dateStr); // 일정 생성 대신 날짜 선택만 수행
    };

    // 선택된 날짜의 일정만 필터링
    const dailyEvents = events.filter(event =>
        event.date === selectedDate &&
        event.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setEditingEvent(null);
    }, []); // 메모리 주소를 고정하여 불필요한 리렌더링 방지

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

    return (
        <div className="workspace">
            <div className="calendar-container"
                 onTouchStart={handleTouchStart}
                 onTouchEnd={handleTouchEnd}>
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
                                    className={`calendar-cell 
                                                ${!dayObj.isCurrentMonth ? 'not-current' : ''} 
                                                ${isToday ? 'today-cell' : ''} 
                                                ${selectedDate === dayObj.dateStr ? 'selected' : ''}
                                        `}
                                    onClick={() => setSelectedDate(dayObj.dateStr)}
                                    onDoubleClick={() => {
                                        if (!isMobile) {
                                            setSelectedDate(dayObj.dateStr);
                                            setIsModalOpen(true);
                                        }
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
                                                style={{backgroundColor: evt.color || `var(--tag-${evt.tag}, var(--tag-기본))`}}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // 셀의 클릭 이벤트 전파 방지
                                                    setEditingEvent(evt);
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                <div className="event-item-content">
                                                    {/* 시작 및 종료 시간 모두 표시 */}
                                                    {evt.startTime && (
                                                        <span className="event-bar-time">
                                                            {evt.startTime}~{evt.endTime}
                                                        </span>
                                                    )}
                                                    <span className="event-title">{evt.title}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* --- [모바일 검색 영역 & 전체 일정 검색 결과 노출] --- */}
                <div className="mobile-search mobile-only-section">
                    <input
                        type="text"
                        placeholder="전체 일정 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mobile-search-input"
                    />

                    {/* 검색어가 입력되었을 때만 결과 목록 표시 */}
                    {searchQuery && (
                        <div className="mobile-search-results" style={{
                            marginTop: '8px',
                            maxHeight: '250px',
                            overflowY: 'auto',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--panel-bg)',
                            zIndex: 10,
                            textAlign: 'left'
                        }}>
                            {filteredEvents.length > 0 ? (
                                filteredEvents.map(evt => (
                                    <div key={evt.id}
                                         onClick={() => {
                                             setSelectedDate(evt.date); // 클릭 시 해당 날짜로 이동
                                             setEditingEvent(evt);
                                             setIsModalOpen(true);
                                         }}
                                         style={{ padding: '12px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                                        <div style={{ fontSize: '11px', color: '#888' }}>{evt.date}</div>
                                        <div style={{ fontWeight: 'bold' }}>{evt.title}</div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>검색 결과가 없습니다.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- [모바일 전용 하단 UI 복구] --- */}
                <div className="mobile-event-section mobile-only-section">
                    <div className="section-header">
                        <h3>📅 {selectedDate} 일정</h3>
                        <button className="add-event-fab" onClick={() => setIsModalOpen(true)}>+</button>
                    </div>

                    <div className="daily-event-list">
                        {dailyEvents.length > 0 ? (
                            dailyEvents.map(event => (
                                <div key={event.id} className="event-item" onClick={() => {
                                    setEditingEvent(event);
                                    setIsModalOpen(true);
                                }}>
                                    <span className="event-tag" style={{backgroundColor: event.color}}></span>
                                    <div className="event-info">
                                        <div className="event-card" onClick={() => {
                                            setEditingEvent(event);
                                            setIsModalOpen(true);
                                        }}>
                                            <div className="event-card-top">
                                                <span
                                                    className="event-dot"
                                                    style={{ backgroundColor: event.color }}
                                                ></span>

                                                <span className="event-date">
                                                  {event.date.substring(5)}
                                                </span>

                                                {event.isDday && (
                                                    <span className="dday">{getDDay(event.date)}</span>
                                                )}
                                            </div>

                                            <div className="event-card-title">
                                                {event.title}
                                            </div>

                                            <div className="event-card-time">
                                                {event.startTime} ~ {event.endTime}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="empty-msg">일정이 없습니다. + 버튼을 눌러 추가하세요!</p>
                        )}
                    </div>
                </div>
            </div>

                {isModalOpen && (
                    <Modal
                        isOpen={isModalOpen}
                        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
                        onSave={handleSaveEvent}
                        onDelete={handleDeleteEvent}
                        event={editingEvent}
                        date={selectedDate} // 선택된 날짜를 기본값으로 전달
                        events={events}
                    />
                )}

            <aside className="calendar-sidebar">
                <div className="sidebar-section">
                    <h3>🔍 일정 검색</h3>
                    <input
                        type="text"
                        placeholder="검색어를 입력하세요"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                {isMobile && searchQuery && (
                    <div className="mobile-search-results" style={{
                        marginTop: '10px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'var(--panel-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        {filteredEvents.length > 0 ? (
                            filteredEvents.map(evt => (
                                <div key={evt.id}
                                     onClick={() => {
                                         setSelectedDate(evt.date);
                                         setEditingEvent(evt);
                                         setIsModalOpen(true);
                                     }}
                                     style={{ padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                                    <div style={{ fontSize: '12px', color: '#888' }}>{evt.date}</div>
                                    <div style={{ fontWeight: 'bold' }}>{evt.title}</div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '10px', color: '#aaa', fontSize: '13px' }}>검색 결과가 없습니다.</div>
                        )}
                    </div>
                )}

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
                <div className="sidebar-section">
                    <h3>📝 {selectedDate && selectedDate.substring(5)} 일정 목록</h3>
                    {dailyEvents.length === 0 ? (
                        <p className="empty-text" style={{ fontSize: '13px', color: '#888' }}>해당 날짜에 일정이 없습니다.</p>
                    ) : (
                        <ul className="sidebar-event-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {dailyEvents.map(evt => (
                                <li key={evt.id} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: evt.color || `var(--tag-${evt.tag}, var(--tag-기본))` }}></span>
                                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{evt.title}</span>
                                    </div>
                                    {(evt.startTime || evt.endTime) && (
                                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '18px' }}>
                                            🕒 {evt.startTime} ~ {evt.endTime}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>
        </div>
    );
};

export default Calendar;