package com.ford9.weather.report

import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
    /**
     * Returns the name of the main component registered from JavaScript.
     */
    override fun getMainComponentName(): String = "AiWeatherApp"

    /**
     * Initialize activity
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        // Set theme before super.onCreate to prevent black flash
        setTheme(R.style.AppTheme)
        
        // Prevent window background flash
        window.setBackgroundDrawableResource(R.color.app_bg)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        
        super.onCreate(null) // Pass null to prevent crashes on background launch
    }

    /**
     * Returns the instance of the [ReactActivityDelegate].
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

