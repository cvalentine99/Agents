import { Bell, BellOff, Volume2, VolumeX, CheckCircle, XCircle, AlertTriangle, RefreshCw, Target, Pause } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export function NotificationSettings() {
  const { permission, settings, requestPermission, updateSettings } = useNotifications();

  const notificationTypes = [
    { key: 'loopComplete' as const, label: 'Loop Complete', icon: CheckCircle, color: 'text-green-400' },
    { key: 'loopFailed' as const, label: 'Loop Failed', icon: XCircle, color: 'text-red-400' },
    { key: 'circuitBreakerOpen' as const, label: 'Circuit Breaker Open', icon: AlertTriangle, color: 'text-yellow-400' },
    { key: 'circuitBreakerClosed' as const, label: 'Circuit Breaker Closed', icon: RefreshCw, color: 'text-cyan-400' },
    { key: 'iterationMilestone' as const, label: 'Iteration Milestones', icon: Target, color: 'text-purple-400' },
    { key: 'stuckDetected' as const, label: 'Stuck Detection', icon: Pause, color: 'text-orange-400' },
  ];

  return (
    <div className="bg-[#1a1625]/80 border border-purple-500/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-orbitron text-purple-300 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Settings
        </h3>
        
        {permission === 'default' && (
          <button
            onClick={requestPermission}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Enable Notifications
          </button>
        )}
        
        {permission === 'denied' && (
          <span className="text-red-400 text-sm flex items-center gap-1">
            <BellOff className="w-4 h-4" />
            Blocked by browser
          </span>
        )}
        
        {permission === 'granted' && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <Bell className="w-4 h-4" />
            Enabled
          </span>
        )}
      </div>

      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 bg-[#0d0a12] rounded-lg mb-4">
        <div className="flex items-center gap-3">
          {settings.enabled ? (
            <Bell className="w-5 h-5 text-purple-400" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-500" />
          )}
          <div>
            <p className="text-white font-medium">Push Notifications</p>
            <p className="text-gray-400 text-sm">Receive alerts when loops complete or need attention</p>
          </div>
        </div>
        <button
          onClick={() => updateSettings({ enabled: !settings.enabled })}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            settings.enabled ? 'bg-purple-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
              settings.enabled ? 'left-8' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Sound Toggle */}
      <div className="flex items-center justify-between p-4 bg-[#0d0a12] rounded-lg mb-4">
        <div className="flex items-center gap-3">
          {settings.sound ? (
            <Volume2 className="w-5 h-5 text-cyan-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-gray-500" />
          )}
          <div>
            <p className="text-white font-medium">Sound Alerts</p>
            <p className="text-gray-400 text-sm">Play audio when notifications arrive</p>
          </div>
        </div>
        <button
          onClick={() => updateSettings({ sound: !settings.sound })}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            settings.sound ? 'bg-cyan-600' : 'bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
              settings.sound ? 'left-8' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Individual Notification Types */}
      <div className="space-y-2">
        <p className="text-gray-400 text-sm mb-3">Notification Types</p>
        {notificationTypes.map(({ key, label, icon: Icon, color }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-[#0d0a12]/50 rounded-lg hover:bg-[#0d0a12] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-gray-300 text-sm">{label}</span>
            </div>
            <button
              onClick={() => updateSettings({ [key]: !settings[key] })}
              disabled={!settings.enabled}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                settings[key] && settings.enabled ? 'bg-purple-600' : 'bg-gray-700'
              } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings[key] ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Test Notification Button */}
      {permission === 'granted' && settings.enabled && (
        <button
          onClick={() => {
            new Notification('🧪 Test Notification', {
              body: 'Notifications are working! You\'ll be alerted when loops complete.',
              icon: '/logo.png',
            });
          }}
          className="w-full mt-4 px-4 py-2 border border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/10 transition-colors text-sm"
        >
          Send Test Notification
        </button>
      )}
    </div>
  );
}
