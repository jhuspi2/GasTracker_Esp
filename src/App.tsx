/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchGasStations, calculateDistance, getCachedStations } from './services/fuelService';
import { parseSearchIntent } from './services/geminiService';
import { GasStation, FuelType, MarketInsight, AppNotification, FUEL_TYPES } from './types';
import { GasMap } from './components/Map';
import { FuelSelector } from './components/FuelSelector';
import { StationDrawer } from './components/StationDrawer';
import { SettingsModal } from './components/SettingsModal';
import { MarketAlert } from './components/MarketAlert';
import { NotificationsList } from './components/NotificationsList';
import { ListSkeleton } from './components/StationSkeleton';
import { useStationFilter } from './hooks/useStationFilter';
import { getMarketInsight } from './services/marketService';
import { getApproximateLocation } from './services/locationService';
import { getSmartAdvice } from './services/geminiService';
import { Search, Loader2, MapPin, List, Map as MapIcon, ChevronRight, Heart, Share2, Settings, Mic, Sparkles, X, ShoppingBag, Droplets, Wind, Coffee, ChevronDown, Filter, Bell, AlertTriangle, Clock, Navigation, MapPin as MapPinIcon, ArrowRight, Route } from 'lucide-react';
import { fetchRealServicesFromOSM } from './services/osmService';
import { motion, AnimatePresence } from 'motion/react';
import type L from 'leaflet';

const SERVICES = [
  { id: 'hasShop', label: 'Tienda', icon: ShoppingBag },
  { id: 'hasCarWash', label: 'Lavado', icon: Droplets },
  { id: 'hasAirWater', label: 'Aire/Agua', icon: Wind },
  { id: 'hasCafe', label: 'Café', icon: Coffee },
];

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function App() {
  const [stations, setStations] = useState<GasStation[]>([]);
  const [selectedFuel, setSelectedFuel] = useState<FuelType>(() => {
    const saved = localStorage.getItem('gas_selected_fuel');
    return (saved as FuelType) || 'G95E5';
  });
  const [loading, setLoading] = useState(true);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    const saved = localStorage.getItem('gas_last_pos');
    return saved ? JSON.parse(saved) : [40.4168, -3.7038];
  });
  const [mapZoom, setMapZoom] = useState<number>(() => {
    const saved = localStorage.getItem('gas_last_zoom');
    return saved ? parseInt(saved) : 13;
  });
  const [lastCenterRequest, setLastCenterRequest] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [initialLocRequested, setInitialLocRequested] = useState(false);
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'favorites' | 'route'>('map');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('gas_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{name: string, lat: number, lng: number}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('gas_theme') === 'dark');
  const [isAILoading, setIsAILoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [marketInsight, setMarketInsight] = useState<MarketInsight | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<'main' | 'origin' | 'dest' | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('gas_notifications');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('gas_search_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAppStarting, setIsAppStarting] = useState(true);
  const [isRecentHistoryOpen, setIsRecentHistoryOpen] = useState(false);
  const [routeHistory, setRouteHistory] = useState<{origin: string, dest: string, originCoords: [number, number], destCoords: [number, number]}[]>(() => {
    const saved = localStorage.getItem('gas_route_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeOrigin, setRouteOrigin] = useState('');
  const [routeDest, setRouteDest] = useState('');
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);
  const [routeOriginCoords, setRouteOriginCoords] = useState<[number, number] | null>(null);
  const [routeDestCoords, setRouteDestCoords] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('gas_settings');
    return saved ? JSON.parse(saved) : {
      travelMode: false,
      priceAlerts: true
    };
  });

  useEffect(() => {
    localStorage.setItem('gas_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('gas_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('gas_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('gas_last_pos', JSON.stringify(mapCenter));
    localStorage.setItem('gas_last_zoom', mapZoom.toString());
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    localStorage.setItem('gas_selected_fuel', selectedFuel);
  }, [selectedFuel]);

  useEffect(() => {
    localStorage.setItem('gas_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem('gas_route_history', JSON.stringify(routeHistory));
  }, [routeHistory]);

  useEffect(() => {
    if (routeOriginCoords && routeDestCoords) {
      const d = calculateDistance(routeOriginCoords[0], routeOriginCoords[1], routeDestCoords[0], routeDestCoords[1]);
      setRouteDistance(d);
    } else {
      setRouteDistance(null);
    }
  }, [routeOriginCoords, routeDestCoords]);

  // Enrich selected station with real OSM services when clicked
  useEffect(() => {
    if (selectedStation && !selectedStation.isEnriched) {
      const enrich = async () => {
        const services = await fetchRealServicesFromOSM(selectedStation);
        if (Object.keys(services).length > 0) {
          const enrichedData = { ...services, isEnriched: true };
          setStations(prev => prev.map(s => 
            s.id === selectedStation.id ? { ...s, ...enrichedData } : s
          ));
          setSelectedStation(prev => prev?.id === selectedStation.id ? { ...prev, ...enrichedData } : prev);
        }
      };
      enrich();
    }
  }, [selectedStation?.id]);

  const filteredStations = useStationFilter(
    stations,
    selectedFuel,
    searchQuery,
    viewMode,
    mapBounds,
    activeServices,
    userLocation,
    favorites,
    mapZoom,
    routePath
  );

  // Initial geolocate on mount
  useEffect(() => {
    if (!initialLocRequested) {
      setInitialLocRequested(true);
      handleGoToLocation();
    }
  }, [initialLocRequested]);

  useEffect(() => {
    const currentQuery = activeSearchField === 'main' ? searchQuery : 
                        activeSearchField === 'origin' ? routeOrigin : 
                        activeSearchField === 'dest' ? routeDest : '';
    
    if (!activeSearchField || (!currentQuery && activeSearchField !== 'main')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const q = currentQuery.toLowerCase();
    
    // Filter history based on search query (only for main search)
    const matchingHistory = activeSearchField === 'main' ? searchHistory
      .filter(h => h.toLowerCase().includes(q))
      .map(h => {
        const station = stations.find(s => s.city.toLowerCase() === h.toLowerCase());
        return { 
          name: h, 
          lat: station?.latitude || 0, 
          lng: station?.longitude || 0, 
          isHistory: true 
        };
      })
      .filter(h => h.lat !== 0) : [];

    // Show suggestions if query >= 3 chars OR if main field is focused (history)
    if (currentQuery.length >= 3 || (activeSearchField === 'main' && currentQuery.length < 3 && matchingHistory.length > 0) || (activeSearchField === 'main' && currentQuery.length === 0)) {
      const cityMap = new Map<string, {name: string, lat: number, lng: number, distance?: number, isHistory?: boolean}>();
      
      // Add matching history first
      matchingHistory.forEach(h => {
        cityMap.set(h.name.toLowerCase(), h);
      });

      // Add regular city matches if query long enough
      if (currentQuery.length >= 2) {
        stations.forEach(s => {
          const nameLower = s.city.toLowerCase();
          if (!cityMap.has(nameLower) && nameLower.includes(q)) {
            let distance = 0;
            if (userLocation) {
              distance = calculateDistance(userLocation[0], userLocation[1], s.latitude, s.longitude);
            }
            cityMap.set(nameLower, { name: s.city, lat: s.latitude, lng: s.longitude, distance });
          }
        });
      }

      const sortedSuggestions = Array.from(cityMap.values())
        .sort((a, b) => {
          // Priority 1: History always first
          if (a.isHistory && !b.isHistory) return -1;
          if (!a.isHistory && b.isHistory) return 1;

          // Priority 2: Exact start match
          const aStarts = a.name.toLowerCase().startsWith(q);
          const bStarts = b.name.toLowerCase().startsWith(q);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;

          // Priority 3: Proximity
          return (a.distance || 0) - (b.distance || 0);
        })
        .slice(0, 8);

      setSuggestions(sortedSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, routeOrigin, routeDest, activeSearchField, stations, userLocation, searchHistory]);

  const handleCalculateRoute = async () => {
    let start = routeOriginCoords;
    let end = routeDestCoords;
    
    // If "Mi ubicación" was used but coords not set yet
    if (routeOrigin === 'Mi ubicación' && userLocation) {
      start = userLocation;
    }
    
    if (!start || !end) return;
    
    // Add to history
    setRouteHistory(prev => {
      const exists = prev.find(r => r.origin === routeOrigin && r.dest === routeDest);
      if (exists) return prev;
      return [{ origin: routeOrigin, dest: routeDest, originCoords: start as [number, number], destCoords: end as [number, number] }, ...prev].slice(0, 3);
    });

    setLoading(true);
    try {
      // Fetch from OSRM (free public routing service)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        // OSRM returns [lon, lat], Leaflet wants [lat, lon]
        const coords = data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        setRoutePath(coords);
        setViewMode('map');
        setHasSearched(true);
        
        // Fit map to route
        const lats = coords.map((c: number[]) => c[0]);
        const lngs = coords.map((c: number[]) => c[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        setMapCenter([(minLat + maxLat) / 2, (minLng + maxLng) / 2]);
        setMapZoom(10);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAISearch = async (query: string) => {
    if (!query) return;
    setIsAILoading(true);
    const intent = await parseSearchIntent(query);
    setIsAILoading(false);

    if (intent.fuel) setSelectedFuel(intent.fuel);
    if (intent.city) {
      setSearchQuery(intent.city);
      const cityStation = stations.find(s => 
        s.city.toLowerCase().includes(intent.city!.toLowerCase())
      );
      if (cityStation) {
        const coords: [number, number] = [cityStation.latitude, cityStation.longitude];
        setMapCenter(coords);
        setMapZoom(13);
        setShowSuggestions(false);
      }
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta búsqueda por voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      handleAISearch(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const addToSearchHistory = (query: string) => {
    if (!query || query.length < 2) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      return [query, ...filtered].slice(0, 5);
    });
  };

  const handleManualSearch = () => {
    if (!searchQuery) return;
    setRoutePath(null); // Clear route when doing normal search
    setRouteDistance(null);
    addToSearchHistory(searchQuery);
    const cityStation = stations.find(s => 
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (cityStation) {
      const target: [number, number] = [cityStation.latitude, cityStation.longitude];
      setMapCenter(target);
      setMapZoom(13);
      setHasSearched(true);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: {name: string, lat: number, lng: number}) => {
    if (activeSearchField === 'main') {
      setRoutePath(null); // Clear route
      setSearchQuery(suggestion.name);
      addToSearchHistory(suggestion.name);
      const target: [number, number] = [suggestion.lat, suggestion.lng];
      setMapCenter(target);
      setMapZoom(14);
      setHasSearched(true);
    } else if (activeSearchField === 'origin') {
      setRouteOrigin(suggestion.name);
      setRouteOriginCoords([suggestion.lat, suggestion.lng]);
    } else if (activeSearchField === 'dest') {
      setRouteDest(suggestion.name);
      setRouteDestCoords([suggestion.lat, suggestion.lng]);
    }
    
    setActiveSearchField(null);
    setShowSuggestions(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleDismissInsight = () => {
    if (marketInsight) {
      // Even if closed, save to notifications if not already there
      const existing = notifications.find(n => n.id === marketInsight.id);
      if (!existing) {
        const newNotif: AppNotification = {
          id: marketInsight.id,
          title: marketInsight.title,
          message: marketInsight.message,
          date: new Date().toLocaleDateString('es-ES'),
          isRead: true, // Marked as read because user saw the popup and closed it
          type: 'market'
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
      setMarketInsight(null);
    }
  };

  const handleViewInsight = () => {
    if (marketInsight) {
      const existingIdx = notifications.findIndex(n => n.id === marketInsight.id);
      if (existingIdx === -1) {
        const newNotif: AppNotification = {
          id: marketInsight.id,
          title: marketInsight.title,
          message: marketInsight.message,
          date: new Date().toLocaleDateString('es-ES'),
          isRead: true,
          type: 'market'
        };
        setNotifications(prev => [newNotif, ...prev]);
      } else {
        // Just mark as read if it somehow existed
        markNotificationAsRead(marketInsight.id);
      }
      setMarketInsight(null);
      setIsNotificationsOpen(true);
    }
  };

  const handleGoToLocation = () => {
    setLastCenterRequest(Date.now());
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(newLoc);
          setMapCenter(newLoc);
          setMapZoom(15);
          setMapBounds(null);
          setHasSearched(false);
        },
        (err) => {
          console.warn('Geolocation error', err);
          setMapCenter([40.4168, -3.7038]);
          setMapZoom(6);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 
        }
      );
    }
  };

  // Default center (Spain context)
  const defaultCenter: [number, number] = [40.4168, -3.7038];

  useEffect(() => {
    // Hierarchical Location Initialization
    setLoadingLocation(true);
    const hasSavedPos = localStorage.getItem('gas_last_pos');
    
    // 1. Start with high-speed IP check (approximate location)
    // Only used if no history exists
    getApproximateLocation().then(approxLoc => {
      if (approxLoc && !hasSearched && !userLocation && !hasSavedPos) {
        setMapCenter([approxLoc.latitude, approxLoc.longitude]);
        setMapZoom(13);
      }
      if (!hasSavedPos) setLoadingLocation(false);
    });

    // 2. Request Precise Geolocation (GPS)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          
          // CRITICAL HIERARCHY: Only update camera if user hasn't searched (Priority 1)
          if (!hasSearched) {
            setMapCenter(loc);
            setMapZoom(13);
          }
          setLoadingLocation(false);
        },
        (err) => {
          console.warn('Geolocation disabled', err);
          setLoadingLocation(false);
        },
        { timeout: 10000 }
      );
    } else {
      setLoadingLocation(false);
    }

    // Safety timeout for loading screen
    const safetyTimer = setTimeout(() => setLoadingLocation(false), 3000);

    // Splash screen timer
    const splashTimer = setTimeout(() => setIsAppStarting(false), 2000);

    // 3. Background Sync Pattern (Fast Start)
    const cachedData = getCachedStations();
    if (cachedData.length > 0) {
      setStations(cachedData);
      setLoading(false);
    }

    fetchGasStations().then((data) => {
      setStations(data);
      setLoading(false);
    });

    // 3. Fetch market insight
    getMarketInsight().then((insight) => {
      if (!insight) return;
      
      const today = new Date().toISOString().split('T')[0];
      const isToday = insight.date === today;
      
      // Check if we already have this notification
      const hasAlready = notifications.some(n => n.id === insight.id);

      if (isToday && !hasAlready) {
        setMarketInsight(insight);
        
        // Browser Push Notification
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(insight.title, { body: insight.message, icon: 'https://cdn-icons-png.flaticon.com/512/3239/3239458.png' });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
              if (permission === "granted") {
                new Notification(insight.title, { body: insight.message, icon: 'https://cdn-icons-png.flaticon.com/512/3239/3239458.png' });
              }
            });
          }
        }
      } else if (!isToday && !hasAlready) {
        // Just add to history if it's old but new to us
        setNotifications(prev => [{
          id: insight.id,
          title: insight.title,
          message: insight.message,
          date: insight.date,
          isRead: false,
          type: 'market'
        }, ...prev]);
      }
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

  if (isAppStarting) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-0 z-0 h-full w-full"
        >
          <img 
            src="/splash_h.png" 
            alt="Splash Desktop" 
            className="hidden md:block w-full h-full object-cover"
            onError={(e) => {
              (e.target as any).style.display = 'none';
            }}
          />
          <img 
            src="/splash_v.png" 
            alt="Splash Mobile" 
            className="block md:hidden w-full h-full object-cover"
            onError={(e) => {
              (e.target as any).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </motion.div>
        
        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 mb-6 shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-[#2563eb]/20 animate-pulse" />
               <span className="text-4xl relative z-10">⛽</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">GasTracker</h1>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-bounce" />
            </div>
          </motion.div>
        </div>
        
        <div className="absolute bottom-12 left-0 right-0 flex justify-center">
           <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em]">Ahorra en cada kilómetro</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden font-sans" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Market Awareness Alert (Pop-up style) */}
      <MarketAlert 
        insight={marketInsight} 
        onClose={handleDismissInsight} 
        onView={handleViewInsight}
      />

      {/* Notifications list side panel */}
      <NotificationsList 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onClearAll={clearNotifications}
      />

      <AnimatePresence>
        {loadingLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-[#2563eb]/20 border-t-[#2563eb] rounded-full animate-spin"></div>
              <div className="absolute inset-x-0 -bottom-1 w-full h-1 bg-[#2563eb]/20 overflow-hidden rounded-full">
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  className="w-1/2 h-full bg-[#2563eb]"
                />
              </div>
            </div>
            <h3 className="text-sm font-black text-[#1e293b] dark:text-white uppercase tracking-[0.3em] animate-pulse">
              Localizando...
            </h3>
            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest opacity-60">
              Ajustando precisión del mapa
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="z-20 pt-3 pb-0 shadow-lg bg-[#0f172a] dark:bg-black border-b border-white/5">
        <div className="px-4 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⛽</span>
              <h1 className="text-[17px] font-black text-white tracking-tight uppercase">GasTracker</h1>
            </div>
            <div className="flex items-center gap-3">
            <div className="flex bg-white/5 p-0.5 rounded-lg">
              <button 
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded transition-all ${viewMode === 'map' ? 'bg-[#2563eb] text-white' : 'text-white/40'}`}
                title="Mapa"
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('route')}
                className={`p-1.5 rounded transition-all ${viewMode === 'route' ? 'bg-[#2563eb] text-white' : 'text-white/40'}`}
                title="Ruta"
              >
                <Route className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('favorites')}
                className={`p-1.5 rounded transition-all ${viewMode === 'favorites' ? 'bg-[#2563eb] text-white' : 'text-white/40'}`}
                title="Favoritos"
              >
                <Heart className={`w-4 h-4 ${viewMode === 'favorites' ? 'fill-current' : ''}`} />
              </button>
            </div>

            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="p-1 relative text-white/40 hover:text-white transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <div className="absolute top-0 right-0 bg-[#ef4444] text-white text-[9px] font-black px-1 h-3.5 flex items-center justify-center rounded-sm border-[1px] border-[#0f172a] transform translate-x-1/3 -translate-y-1/3">
                  {notifications.filter(n => !n.isRead).length}
                </div>
              )}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-1 text-white/40 hover:text-white transition-colors"
              title="Ajustes"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

        <div className="pb-2 flex flex-col gap-2 relative">
          <div className="px-4 flex items-center gap-2">
            <div className="relative flex-1">
              <button 
                onClick={handleManualSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                title="Buscar municipio"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <input 
                type="text" 
                placeholder="Municipio..."
                className="w-full bg-white/5 border border-white/10 rounded-[6px] py-2 pl-9 pr-10 text-xs text-white placeholder:text-white/30 focus:bg-white/10 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                onBlur={() => setTimeout(() => setActiveSearchField(null), 200)}
                onFocus={() => setActiveSearchField('main')}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {searchQuery && (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    className="p-1 text-white/20 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="w-[1px] h-4 bg-white/5 mx-0.5" />
                <button 
                  onClick={startVoiceSearch}
                  disabled={isAILoading || isListening}
                  className={`transition-colors p-1 ${
                    isListening ? 'text-[#ef4444] animate-pulse' : 'text-white/30 hover:text-[#2563eb]'
                  }`}
                  title="Búsqueda por voz"
                >
                  {isAILoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && activeSearchField === 'main' && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-[#1e293b] border border-white/10 rounded-lg shadow-2xl z-[100] overflow-hidden"
                  >
                    {suggestions.map((item, idx) => (
                      <button
                        key={`${item.name}-${idx}`}
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full px-4 py-3 text-left text-xs text-white/80 hover:bg-white/10 border-b border-white/5 last:border-0 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          {item.isHistory ? (
                            <Clock className="w-3 h-3 text-white/30" />
                          ) : (
                            <MapPin className="w-3 h-3 text-[#2563eb]" />
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-tight">{item.name}</span>
                            {item.isHistory && <span className="text-[8px] text-[#2563eb] font-black uppercase tracking-[0.1em]">Reciente</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                    {searchHistory.length > 0 && searchQuery.length === 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchHistory([]);
                        }}
                        className="w-full py-2 bg-black/20 text-[8px] font-black text-[#ef4444] uppercase tracking-widest hover:bg-[#ef4444]/10 transition-colors"
                      >
                        Limpiar Historial
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setIsServicesOpen(!isServicesOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[10px] font-black uppercase tracking-widest border transition-all ${
                  activeServices.length > 0
                    ? 'bg-[#2563eb] border-[#2563eb] text-white shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Servicios</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isServicesOpen && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setIsServicesOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full right-0 mt-1 bg-[#1e293b] border border-white/10 rounded-lg shadow-2xl z-[100] overflow-hidden min-w-[160px]"
                    >
                      {SERVICES.map(({ id, label, icon: Icon }) => {
                        const isActive = activeServices.includes(id);
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              setActiveServices(prev => 
                                isActive ? prev.filter(s => s !== id) : [...prev, id]
                              );
                            }}
                            className={`w-full px-4 py-3 text-left text-xs transition-all flex items-center gap-3 border-b border-white/5 last:border-0 hover:bg-white/5 ${
                              isActive ? 'bg-[#2563eb]/20 text-white' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-[#2563eb]' : ''}`} />
                            <span className="font-bold uppercase tracking-tighter">{label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563eb]" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <FuelSelector selectedFuel={selectedFuel} onSelect={setSelectedFuel} compact />
      </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#f1f5f9] dark:bg-black z-30"
            >
              {viewMode === 'list' ? (
                <div className="p-4 pt-16">
                  <ListSkeleton />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Loader2 className="w-10 h-10 text-[#0f172a] dark:text-[#2563eb] animate-spin mb-4" />
                  <p className="text-sm font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Sincronizando datos...</p>
                </div>
              )}
            </motion.div>
          ) : viewMode === 'route' ? (
            <motion.div 
              key="route"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full w-full bg-[#f1f5f9] dark:bg-black p-6 flex flex-col items-center"
            >
              <div className="w-full max-w-md">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-[#2563eb] p-3 rounded-2xl shadow-lg shadow-[#2563eb]/20">
                    <Route className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#1e293b] dark:text-white uppercase tracking-tighter">Planificador de Ruta</h2>
                    <p className="text-[10px] font-bold text-[#64748b] dark:text-zinc-500 uppercase tracking-[0.2em]">Encuentra el mejor precio en tu trayecto</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border border-[#e2e8f0] dark:border-zinc-800 space-y-6 relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#2563eb]/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
                  
                  <div className="space-y-4 relative">
                    {/* Visual Journey Line */}
                    <div className="absolute left-4 top-6 bottom-6 w-[2px] flex flex-col items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-[#2563eb] bg-white dark:bg-zinc-900 shrink-0" />
                      <div className="flex-1 w-[2px] bg-gradient-to-b from-[#2563eb] via-zinc-200 dark:via-zinc-800 to-[#2563eb]" />
                      <MapPinIcon className="w-4 h-4 text-[#2563eb] shrink-0" />
                    </div>

                    <div className="pl-12 space-y-1 relative">
                      <span className="text-[9px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-widest">Origen</span>
                      <input 
                        type="text" 
                        placeholder="Ciudad de salida..." 
                        className="w-full bg-transparent border-b border-zinc-100 dark:border-zinc-800 py-2 text-sm font-bold text-[#1e293b] dark:text-white outline-none focus:border-[#2563eb] transition-colors pr-8"
                        value={routeOrigin}
                        onChange={(e) => setRouteOrigin(e.target.value)}
                        onFocus={() => setActiveSearchField('origin')}
                        onBlur={() => setTimeout(() => setActiveSearchField(null), 200)}
                      />
                      {routeOrigin && (
                        <button 
                          onClick={() => setRouteOrigin('')}
                          className="absolute right-0 bottom-2 text-zinc-300 hover:text-[#ef4444] transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <AnimatePresence>
                        {showSuggestions && activeSearchField === 'origin' && suggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] dark:bg-zinc-900 border border-white/10 dark:border-zinc-800 rounded-xl shadow-2xl z-[200] overflow-hidden"
                          >
                            {suggestions.map((item, idx) => (
                              <button
                                key={`${item.name}-${idx}`}
                                onClick={() => handleSelectSuggestion(item)}
                                className="w-full px-4 py-3 text-left text-[11px] text-white/80 hover:bg-white/10 border-b border-white/5 last:border-0 flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-[#2563eb]/60" />
                                  <span className="font-bold uppercase tracking-tight">{item.name}</span>
                                </div>
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="pl-12 space-y-1 relative">
                      <span className="text-[9px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-widest">Destino</span>
                      <input 
                        type="text" 
                        placeholder="Ciudad de llegada..." 
                        className="w-full bg-transparent border-b border-zinc-100 dark:border-zinc-800 py-2 text-sm font-bold text-[#1e293b] dark:text-white outline-none focus:border-[#2563eb] transition-colors pr-8"
                        value={routeDest}
                        onChange={(e) => setRouteDest(e.target.value)}
                        onFocus={() => setActiveSearchField('dest')}
                        onBlur={() => setTimeout(() => setActiveSearchField(null), 200)}
                      />
                      {routeDest && (
                        <button 
                          onClick={() => setRouteDest('')}
                          className="absolute right-0 bottom-2 text-zinc-300 hover:text-[#ef4444] transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <AnimatePresence>
                        {showSuggestions && activeSearchField === 'dest' && suggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] dark:bg-zinc-900 border border-white/10 dark:border-zinc-800 rounded-xl shadow-2xl z-[200] overflow-hidden"
                          >
                            {suggestions.map((item, idx) => (
                              <button
                                key={`${item.name}-${idx}`}
                                onClick={() => handleSelectSuggestion(item)}
                                className="w-full px-4 py-3 text-left text-[11px] text-white/80 hover:bg-white/10 border-b border-white/5 last:border-0 flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-[#2563eb]/60" />
                                  <span className="font-bold uppercase tracking-tight">{item.name}</span>
                                </div>
                                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {routeDistance !== null && (
                    <div className="flex flex-col items-center justify-center py-2 border-t border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
                      <span className="text-[10px] font-black text-[#64748b] dark:text-zinc-500 uppercase tracking-widest mb-1">Distancia del trayecto</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-[#2563eb]">{routeDistance.toFixed(1)}</span>
                        <span className="text-[10px] font-bold text-zinc-400">KILÓMETROS</span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleCalculateRoute}
                    disabled={!routeOrigin || !routeDest}
                    className="w-full bg-[#1e293b] dark:bg-white text-white dark:text-black font-black py-4 uppercase tracking-[0.2em] text-xs hover:bg-black dark:hover:bg-zinc-200 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 group disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Calcular Ruta
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {routeHistory.length > 0 && (
                    <div className="pt-4 border-t dark:border-zinc-800">
                      <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-3">Historial de rutas</span>
                      <div className="space-y-2">
                        {routeHistory.map((item, i) => (
                          <button 
                            key={i}
                            onClick={() => {
                              setRouteOrigin(item.origin);
                              setRouteOriginCoords(item.originCoords);
                              setRouteDest(item.dest);
                              setRouteDestCoords(item.destCoords);
                            }}
                            className="w-full bg-[#f8fafc] dark:bg-zinc-950 border border-[#e2e8f0] dark:border-zinc-800 p-3 rounded-xl text-left hover:border-[#2563eb] transition-all flex items-center justify-between group"
                          >
                            <span className="text-[11px] font-bold text-[#1e293b] dark:text-zinc-300">
                              De <span className="text-[#2563eb]">{item.origin}</span> a <span className="text-[#2563eb]">{item.dest}</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-[#2563eb] transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : viewMode === 'map' ? (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <GasMap 
                center={mapCenter}
                zoom={mapZoom}
                lastCenterRequest={lastCenterRequest}
                stations={filteredStations}
                userLocation={userLocation}
                selectedFuel={selectedFuel}
                isDarkMode={isDarkMode}
                routePath={routePath}
                onStationSelect={setSelectedStation}
                onBoundsChange={handleBoundsChange}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="h-full w-full overflow-y-auto px-4 py-4 space-y-2 bg-[#f1f5f9] dark:bg-black"
            >
              {filteredStations.map((station) => {
                const isActive = selectedStation?.id === station.id;
                const estTime = station.distance ? Math.round(station.distance * 1.5 + 2) : 0; // Rough driving estimate
                return (
                  <button 
                    key={station.id}
                    onClick={() => setSelectedStation(station)}
                    className={`w-full bg-white dark:bg-zinc-900 border border-[#e2e8f0] dark:border-zinc-800 p-4 rounded-none transition-all text-left flex justify-between items-center group relative overflow-hidden ${isActive ? 'ring-2 ring-inset ring-[#2563eb] z-10' : ''}`}
                  >
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px] dark:invert" />
                    
                    <div className="flex-1 min-w-0 pr-4 relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-[#1e293b] dark:text-white uppercase tracking-tighter">{station.name}</span>
                        {station.distance !== undefined && (
                          <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-black text-[#2563eb] dark:text-[#3b82f6] uppercase tracking-tight">
                              {station.distance.toFixed(1)} KM
                            </span>
                            <span className="text-[10px] font-bold text-[#64748b]">
                              • {estTime} MIN
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center text-[#94a3b8] dark:text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">
                        <MapPin className="w-3 h-3 mr-1 shrink-0" />
                        <span className="truncate">{station.address}, {station.city}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end relative z-10">
                      <div className="flex items-baseline gap-0.5">
                        <span className={`text-[22px] font-black leading-none font-mono tracking-tighter ${station.priceTier === 'cheap' ? 'text-green-500' : 'text-[#1e293b] dark:text-white'}`}>
                          {station.prices[selectedFuel]?.toFixed(3)}
                        </span>
                        <span className="text-[10px] font-black text-[#94a3b8] uppercase">€</span>
                      </div>
                      {station.priceTier === 'cheap' ? (
                         <span className="text-[8px] font-black bg-green-500 text-white px-1.5 py-0.5 mt-1 uppercase tracking-tighter">MEJOR PRECIO</span>
                      ) : (
                         <span className="text-[8px] font-black text-[#94a3b8] mt-1 uppercase tracking-tighter">{FUEL_TYPES.find(f => f.id === selectedFuel)?.label}</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredStations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative mb-8">
                    <div className="text-[120px] font-black text-zinc-100 dark:text-zinc-900 leading-none select-none">
                      0
                    </div>
                    <Search className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#2563eb]" />
                  </div>
                  <h3 className="text-xl font-black text-[#1e293b] dark:text-white uppercase mb-2 tracking-tighter">Sin resultados</h3>
                  <p className="text-sm font-bold text-[#64748b] dark:text-zinc-500 uppercase tracking-widest max-w-[240px] text-center leading-relaxed">
                    No hemos encontrado nada en esta zona con los filtros actuales
                  </p>
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setActiveServices([]);
                    }}
                    className="mt-8 px-6 py-3 bg-[#2563eb] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-none hover:bg-black transition-all"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Detail Drawer */}
      <StationDrawer 
        station={selectedStation} 
        selectedFuel={selectedFuel} 
        isFavorite={selectedStation ? favorites.includes(selectedStation.id) : false}
        onToggleFavorite={toggleFavorite}
        onClose={() => setSelectedStation(null)} 
        isDarkMode={isDarkMode}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        settings={settings}
        updateSettings={(newSettings: any) => setSettings({ ...settings, ...newSettings })}
      />

      {/* User Location FAB */}
      {viewMode === 'map' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleGoToLocation();
          }}
          className="fixed bottom-[80px] right-2 bg-white/90 dark:bg-zinc-800/90 text-[#2563eb] dark:text-blue-400 p-2.5 rounded-full shadow-lg z-[40] border border-zinc-100 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center backdrop-blur-sm"
          title="Centrar en mi ubicación"
        >
          <Navigation className="w-4 h-4 fill-current" />
        </button>
      )}

      {routePath && viewMode === 'map' && (
        <button
          onClick={() => {
            setRoutePath(null);
            setRouteDistance(null);
            setRouteOrigin('');
            setRouteDest('');
            setRouteOriginCoords(null);
            setRouteDestCoords(null);
          }}
          className="fixed bottom-[80px] left-2 bg-[#ef4444] text-white px-4 py-2.5 rounded-full shadow-lg z-[40] border border-[#ef4444]/20 hover:bg-[#dc2626] active:scale-90 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
        >
          <Navigation className="w-4 h-4 rotate-180" />
          <span>Eliminar ruta</span>
        </button>
      )}

      {/* Advertising Space */}
      <div className="bg-[#f8fafc] dark:bg-zinc-950 border-t border-[#e2e8f0] dark:border-zinc-900 h-16 flex items-center justify-center relative overflow-hidden flex-shrink-0 z-20">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] dark:invert" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94a3b8] dark:text-zinc-600">Espacio Publicitario</span>
      </div>
    </div>
  );
}
