/**
 * AdMob Integration Service
 * Handles banner, interstitial, and rewarded video ads
 */

export const AdMobConfig = {
  // Replace with your actual AdMob IDs from AdMob console
  // For testing, these test IDs are provided
  appId: 'ca-app-pub-3940256099942544~3347511713', // Test App ID
  
  bannerAdId: {
    android: 'ca-app-pub-3940256099942544/6300978111', // Test Banner
    ios: 'ca-app-pub-3940256099942544/2934735716'
  },
  
  interstitialAdId: {
    android: 'ca-app-pub-3940256099942544/1033173712', // Test Interstitial
    ios: 'ca-app-pub-3940256099942544/4411468910'
  },
  
  rewardedAdId: {
    android: 'ca-app-pub-3940256099942544/5224354917', // Test Rewarded
    ios: 'ca-app-pub-3940256099942544/1712485313'
  }
};

export class AdMobService {
  constructor() {
    this.admob = window.admob || null;
    this.interstitialReady = false;
    this.rewardedReady = false;
    this.platform = null;
    this.adCounter = 0; // Track games for interstitial frequency
  }

  /**
   * Initialize AdMob service
   */
  async init() {
    // Check if running in Cordova/Capacitor environment
    if (!this.admob) {
      console.log('AdMob not available - running in browser (ads disabled)');
      return;
    }

    try {
      this.platform = this.admob.platform || 'android';
      await this.admob.start();
      
      this.setupBanner();
      await this.prepareInterstitial();
      await this.prepareRewarded();
      
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('AdMob initialization error:', error);
    }
  }

  /**
   * Setup and prepare banner ad
   */
  setupBanner() {
    if (!this.admob) return;

    const bannerId = this.platform === 'android' 
      ? AdMobConfig.bannerAdId.android 
      : AdMobConfig.bannerAdId.ios;

    this.admob.banner.config({
      id: bannerId,
      isTesting: true, // Set to false for production
      autoShow: false,
      position: this.admob.AD_POSITION.BOTTOM_CENTER,
      size: this.admob.AD_SIZE.SMART_BANNER
    });

    this.admob.banner.prepare();
  }

  /**
   * Show banner ad
   */
  showBanner() {
    if (this.admob && this.admob.banner) {
      this.admob.banner.show();
    }
  }

  /**
   * Hide banner ad
   */
  hideBanner() {
    if (this.admob && this.admob.banner) {
      this.admob.banner.hide();
    }
  }

  /**
   * Prepare interstitial ad
   */
  async prepareInterstitial() {
    if (!this.admob) return;

    const interstitialId = this.platform === 'android'
      ? AdMobConfig.interstitialAdId.android
      : AdMobConfig.interstitialAdId.ios;

    this.admob.interstitial.config({
      id: interstitialId,
      isTesting: true, // Set to false for production
      autoShow: false
    });

    try {
      await this.admob.interstitial.prepare();
      this.interstitialReady = true;
    } catch (error) {
      console.error('Interstitial prepare error:', error);
      this.interstitialReady = false;
    }
  }

  /**
   * Show interstitial ad (call on game over every 3-5 games)
   */
  async showInterstitial() {
    if (!this.admob || !this.interstitialReady) return;

    try {
      await this.admob.interstitial.show();
      this.interstitialReady = false;
      // Prepare next ad
      setTimeout(() => this.prepareInterstitial(), 1000);
    } catch (error) {
      console.error('Interstitial show error:', error);
    }
  }

  /**
   * Prepare rewarded video ad
   */
  async prepareRewarded() {
    if (!this.admob) return;

    const rewardedId = this.platform === 'android'
      ? AdMobConfig.rewardedAdId.android
      : AdMobConfig.rewardedAdId.ios;

    this.admob.rewardvideo.config({
      id: rewardedId,
      isTesting: true, // Set to false for production
      autoShow: false
    });

    try {
      await this.admob.rewardvideo.prepare();
      this.rewardedReady = true;
    } catch (error) {
      console.error('Rewarded video prepare error:', error);
      this.rewardedReady = false;
    }
  }

  /**
   * Show rewarded video ad
   * @param {Function} onRewarded - Callback when user earns reward
   * @returns {Promise<boolean>} True if user watched ad, false if closed early
   */
  async showRewarded(onRewarded) {
    if (!this.admob || !this.rewardedReady) {
      // Fallback: grant reward without ad in browser
      if (onRewarded) onRewarded();
      return true;
    }

    return new Promise((resolve) => {
      const rewardHandler = () => {
        if (onRewarded) onRewarded();
        this.rewardedReady = false;
        setTimeout(() => this.prepareRewarded(), 1000);
        this.admob.removeEventListener('onRewardedVideoAdRewarded', rewardHandler);
        this.admob.removeEventListener('onRewardedVideoAdClosed', closeHandler);
        resolve(true);
      };

      const closeHandler = () => {
        setTimeout(() => this.prepareRewarded(), 1000);
        this.admob.removeEventListener('onRewardedVideoAdRewarded', rewardHandler);
        this.admob.removeEventListener('onRewardedVideoAdClosed', closeHandler);
        resolve(false);
      };

      this.admob.addEventListener('onRewardedVideoAdRewarded', rewardHandler);
      this.admob.addEventListener('onRewardedVideoAdClosed', closeHandler);

      this.admob.rewardvideo.show();
    });
  }

  /**
   * Check if should show interstitial ad (every 3 games)
   */
  shouldShowInterstitial() {
    this.adCounter++;
    if (this.adCounter >= 3) {
      this.adCounter = 0;
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const adMobService = new AdMobService();
