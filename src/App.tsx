import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, Info, Tv } from 'lucide-react';
import axios from 'axios';

interface AnimeSchedule {
  mal_id: number;
  title: string;
  title_japanese: string;
  title_korean?: string;
  broadcast: {
    day: string;
    time: string;
  };
  status: string;
  genres: Array<{ name: string }>;
  demographics: Array<{ name: string }>;
  studios: Array<{ name: string }>;
  url: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
}

interface TMDBSearchResult {
  results: Array<{
    id: number;
    name: string;
    original_name: string;
    original_language: string;
  }>;
}

const TMDB_API_KEY = 'cb05affb505c750c0245898b313af2b0';

// Keywords that indicate a show should be excluded
const excludedKeywords = [
  'wishcat', 'tiny ping', 'ninjala', 'chibi maruko', 'sazae',
  'doraemon', 'crayon shin-chan', 'pokemon', 'digimon', 'youkai watch',
  'anpanman', 'mini mini', 'minimini', 'miniforce', 'ping pong',
  'pingu', 'pororo', 'tayo', 'robocar', 'larva', 'kongsuni',
  'cocomong', 'tobot', 'power battle watch', 'pochaazu', 'rakuten',
  'bonobono', 'detective conan', 'case closed', 'pretty cure', 'precure',
  'i-pre', 'ipre', 'manul no yuube', 'mashin souzou-sen wataru',
  'shin nippon history', 'kinnikuman', 'wish cat', 'tiniping',
  'ウィッシュキャット', 'ティニピン', 'キン肉マン', 'まぬるの夕べ',
  '魔神創造伝ワタル', '新日本史', 'キン肉マンII世', 'シューティングスター',
  'ぼのぼの', 'コナン', 'プリキュア', 'ドラえもん', 'クレヨンしんちゃん',
  'ポケットモンスター', 'デジモン', '妖怪ウォッチ', 'アンパンマン',
  'ミニミニ', 'ピングー', 'ポロロ', 'タヨ', 'ロボカー', 'ラーバ',
  'コンスニ', 'ココモン', 'トボット', 'パワーバトルウォッチカー',
  'ポチャーズ', 'pochaazu', 'pochazu', 'pochaaz', 'ぽちゃーず', 'ぽちゃーズ'
];

const excludedStudios = [
  'tencent', 'bilibili', 'dongwoo', 'iconix', 'toei animation', 
  'studio pierrot', 'tms entertainment', 'shin-ei animation',
  'tv tokyo', 'olm', 'sunrise', 'bandai namco pictures'
];

const excludedGenres = [
  'kids', 'children', 'family', 'educational', 'kodomo'
];

// 방송국별 시간대 매핑
const CHANNEL_TIME_MAPPING: Record<string, string[]> = {
  'TOKYO MX': ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '24:00', '24:30', '25:00', '25:30', '26:00'],
  'テレビ東京': ['17:55', '18:25', '24:00', '24:30', '25:00', '25:30', '26:00', '26:30'],
  'BS11': ['22:00', '22:30', '23:00', '23:30', '24:00', '24:30', '25:00', '25:30', '26:00'],
  'AT-X': ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '24:00'],
  'フジテレビ': ['17:30', '24:00', '24:30', '24:55', '25:25', '25:55', '26:25'],
  'TBS': ['24:00', '24:30', '25:00', '25:28', '25:58', '26:28', '26:58'],
  'テレビ朝日': ['17:30', '25:00', '25:30', '26:00', '26:30'],
  'NHK Eテレ': ['17:35', '18:45', '19:25', '19:55', '23:00', '23:30'],
  'ABC': ['25:44', '26:14', '26:44'],
  'メ～テレ': ['25:29', '25:59', '26:29', '26:59'],
  'tvk': ['24:00', '24:30', '25:00', '25:30', '26:00'],
  'KBS京都': ['24:00', '24:30', '25:00', '25:30', '26:00'],
  'サンテレビ': ['24:30', '25:00', '25:30', '26:00', '26:30'],
  'チバテレビ': ['24:00', '24:30', '25:00', '25:30', '26:00'],
  'テレビ愛知': ['25:05', '25:35', '26:05', '26:35'],
  'WOWOW': ['22:00', '22:30', '23:00', '23:30', '24:00'],
  'MBS': ['26:00', '26:30', '27:00', '27:30'],
  'テレビ大阪': ['25:05', '25:35', '26:05', '26:35'],
  'BS朝日': ['22:30', '23:00', '23:30', '24:00', '24:30'],
  'BSフジ': ['23:30', '24:00', '24:30', '25:00'],
  'BS日テレ': ['23:00', '23:30', '24:00', '24:30'],
  'BS-TBS': ['23:30', '24:00', '24:30', '25:00'],
  'TOKYO MX2': ['22:00', '22:30', '23:00', '23:30', '24:00'],
  'とちぎテレビ': ['23:30', '24:00', '24:30', '25:00'],
  '群馬テレビ': ['23:30', '24:00', '24:30', '25:00'],
  'テレ玉': ['23:30', '24:00', '24:30', '25:00']
};

function App() {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());
  const [schedule, setSchedule] = useState<AnimeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const daysKR = ['일', '월', '화', '수', '목', '금', '토'];

  const shouldExcludeAnime = useCallback((anime: AnimeSchedule) => {
    const titleLower = anime.title.toLowerCase();
    const japaneseTitleLower = anime.title_japanese?.toLowerCase() || '';
    
    const hasExcludedKeyword = excludedKeywords.some(keyword => 
      titleLower.includes(keyword.toLowerCase()) || 
      japaneseTitleLower.includes(keyword.toLowerCase())
    );

    const hasExcludedStudio = anime.studios?.some(studio => 
      excludedStudios.some(excludedStudio => 
        studio.name.toLowerCase().includes(excludedStudio.toLowerCase())
      )
    );

    const hasKodomoDemographic = anime.demographics?.some(demo => 
      demo.name.toLowerCase() === 'kids' || 
      demo.name.toLowerCase() === 'kodomo'
    );

    const hasExcludedGenre = anime.genres?.some(genre => 
      excludedGenres.some(excludedGenre => 
        genre.name.toLowerCase().includes(excludedGenre.toLowerCase())
      )
    );

    return hasExcludedKeyword || hasExcludedStudio || hasKodomoDemographic || hasExcludedGenre;
  }, []);

  const getChannelByTime = useCallback((time: string) => {
    if (!time) return null;
    
    // 시간을 정규화 (예: "1:30" -> "01:30")
    const normalizedTime = time.padStart(5, '0');
    
    // 시간을 분으로 변환
    const [hours, minutes] = normalizedTime.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    for (const [channel, times] of Object.entries(CHANNEL_TIME_MAPPING)) {
      for (const scheduleTime of times) {
        const [scheduleHours, scheduleMinutes] = scheduleTime.split(':').map(Number);
        const scheduleInMinutes = scheduleHours * 60 + scheduleMinutes;
        
        // 시간이 정확히 일치하거나 15분 이내인 경우
        const minuteDiff = Math.abs(timeInMinutes - scheduleInMinutes);
        if (minuteDiff <= 15) {
          return channel;
        }
      }
    }
    
    return null;
  }, []);

  const fetchKoreanTitle = useCallback(async (title: string, japaneseTitle: string) => {
    try {
      const searchResponse = await axios.get<TMDBSearchResult>(
        'https://api.themoviedb.org/3/search/tv',
        {
          params: {
            api_key: TMDB_API_KEY,
            query: title,
            language: 'ko-KR',
            include_adult: false
          }
        }
      );

      if (searchResponse.data.results.length > 0) {
        const bestMatch = searchResponse.data.results.find(
          result => result.original_language === 'ja'
        );

        if (bestMatch) {
          return bestMatch.name;
        }
      }

      const japaneseSearchResponse = await axios.get<TMDBSearchResult>(
        'https://api.themoviedb.org/3/search/tv',
        {
          params: {
            api_key: TMDB_API_KEY,
            query: japaneseTitle,
            language: 'ko-KR',
            include_adult: false
          }
        }
      );

      if (japaneseSearchResponse.data.results.length > 0) {
        const bestMatch = japaneseSearchResponse.data.results.find(
          result => result.original_language === 'ja'
        );

        if (bestMatch) {
          return bestMatch.name;
        }
      }

      return title;
    } catch (error) {
      console.error('Error fetching Korean title:', error);
      return title;
    }
  }, []);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get('https://api.jikan.moe/v4/schedules', {
          params: {
            filter: days[selectedDay],
            limit: 25,
            sfw: true
          }
        });

        if (!response.data?.data) {
          throw new Error('잘못된 데이터 형식');
        }

        const filteredAnime = response.data.data
          .filter((anime: AnimeSchedule) => !shouldExcludeAnime(anime))
          .filter((anime: AnimeSchedule, index: number, self: AnimeSchedule[]) =>
            index === self.findIndex((a) => a.mal_id === anime.mal_id)
          );

        const batchSize = 3;
        const titlesWithKorean = [];
        
        for (let i = 0; i < filteredAnime.length; i += batchSize) {
          const batch = filteredAnime.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (anime) => {
              const koreanTitle = await fetchKoreanTitle(anime.title, anime.title_japanese);
              return {
                ...anime,
                title_korean: koreanTitle
              };
            })
          );
          titlesWithKorean.push(...batchResults);
          
          if (i + batchSize < filteredAnime.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        setSchedule(titlesWithKorean);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다';
        setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [selectedDay, shouldExcludeAnime, fetchKoreanTitle]);

  const formatTime = useCallback((timeString: string | undefined) => {
    if (!timeString) return '시간 미정';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? '오후' : '오전';
    const hour12 = hour % 12 || 12;
    return `${ampm} ${hour12}:${minutes}`;
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10 h-14 sm:h-16">
        <div className="container mx-auto px-3 sm:px-4 h-full">
          <div className="flex items-center justify-between h-full">
            <h1 className="text-lg sm:text-xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 
              text-transparent bg-clip-text">
              백지스케줄
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <div className="flex justify-center mb-4 sm:mb-6 px-1 overflow-x-auto scrollbar-hide -mx-2 px-2">
          <nav className="inline-flex bg-white/5 rounded-full p-0.5 sm:p-1 backdrop-blur-sm">
            {daysKR.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className={`relative min-w-[2.5rem] px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full 
                  transition-all duration-300 ${
                  selectedDay === index 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {selectedDay === index && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full 
                    opacity-90 transition-opacity duration-300"></div>
                )}
                <span className="relative z-10">{day}</span>
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur-xl opacity-25 animate-pulse"></div>
              <div className="relative">
                <div className="w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-indigo-500/20 rounded-full"></div>
                <div className="absolute inset-0 w-12 h-12 sm:w-16 sm:h-16 border-3 sm:border-4 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 px-4">
            <Info className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 text-indigo-500/50" />
            <p className="text-base sm:text-lg mb-2">데이터를 불러오는데 실패했습니다</p>
            <p className="text-xs sm:text-sm text-gray-500 whitespace-pre-line text-center max-w-md">{error}</p>
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Calendar className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 text-indigo-500/50" />
            <p className="text-base sm:text-lg">편성표 정보가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {schedule.map((show) => {
              const channel = getChannelByTime(show.broadcast?.time);
              return (
                <div 
                  key={`${show.mal_id}-${show.broadcast.time}`}
                  className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-xl sm:rounded-2xl overflow-hidden
                    hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] touch-manipulation
                    border border-white/5 hover:border-white/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-purple-500/0 to-pink-500/0 
                    group-hover:from-indigo-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-500"></div>
                  <div className="relative h-36 sm:h-48">
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                      {show.images.jpg.image_url ? (
                        <img
                          src={show.images.jpg.image_url}
                          alt={show.title_korean}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                          <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-500/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent">
                        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
                          <div className="flex flex-col gap-0.5">
                            <h2 className="text-sm sm:text-lg font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r 
                              group-hover:from-indigo-400 group-hover:via-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text 
                              transition-colors duration-300 line-clamp-2">
                              {show.title_korean}
                            </h2>
                            {show.title_japanese && (
                              <p className="text-xs text-gray-400 line-clamp-1">
                                {show.title_japanese}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      {show.status === "Currently Airing" && (
                        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium 
                          bg-indigo-500/90 rounded-full shadow-lg shadow-indigo-500/20
                          backdrop-blur-md border border-white/20 group-hover:scale-110 transition-all duration-300">
                          <span className="tracking-wide">방영중</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative p-2.5 sm:p-4 z-10">
                    <div className="flex items-center space-x-1.5 sm:space-x-2 mb-2 sm:mb-3 flex-wrap gap-y-1.5">
                      <div className="flex items-center space-x-1 sm:space-x-1.5 bg-black/20 px-2 sm:px-3 py-1 rounded-full
                        ring-1 ring-white/10 group-hover:ring-white/20 transition-all duration-300">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" />
                        <span className="text-xs sm:text-sm text-gray-300">{formatTime(show.broadcast?.time)}</span>
                      </div>
                      {channel && (
                        <div className="flex items-center space-x-1 sm:space-x-1.5 bg-black/20 px-2 sm:px-3 py-1 rounded-full
                          ring-1 ring-white/10 group-hover:ring-white/20 transition-all duration-300">
                          <Tv className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                          <span className="text-xs sm:text-sm text-gray-300">{channel}</span>
                        </div>
                      )}
                    </div>
                    {show.genres && (
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {show.genres.map((genre, index) => (
                          <span
                            key={`${show.mal_id}-${genre.name}-${index}`}
                            className="px-2 sm:px-3 py-0.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 rounded-full 
                              ring-1 ring-indigo-500/20 transition-all duration-300 hover:bg-indigo-500/20
                              hover:text-white cursor-pointer active:scale-95 touch-manipulation whitespace-nowrap"
                          >
                            {genre.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="container mx-auto px-4 py-4 sm:py-6 text-center">
        <p className="text-xs sm:text-sm text-gray-500">
          방송 시간은 사전 예고 없이 변경될 수 있습니다
        </p>
      </footer>
    </div>
  );
}

export default App;