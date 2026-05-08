<?php

declare(strict_types=1);

// ============================================================
//  CRMS API Routes
//  Format: Router::method('/path', 'Controller@method', 'middleware')
//  Middleware options: '' (public) | 'auth' | 'admin'
// ============================================================

// ── Public ────────────────────────────────────────────────────────────────
Router::get('/cars',                           'CarController@index');
Router::get('/cars/:id',                       'CarController@show');
Router::get('/cars/:id/availability',          'CarController@availability');
Router::get('/cars/:id/reviews',               'CarController@reviews');

Router::post('/auth/register',                 'AuthController@register');
Router::post('/auth/login',                    'AuthController@login');

// AI — public so guests can use recommender too
Router::post('/ai/recommend',                  'AiController@recommend');
Router::post('/ai/chat',                       'AiController@chat');
Router::get('/ai/reviews/:carId/summary',      'AiController@summarizeReviews');

// ── Auth required (logged-in customers) ───────────────────────────────────
Router::post('/auth/logout',                   'AuthController@logout',          'auth');
Router::get('/auth/me',                        'AuthController@me',              'auth');

Router::post('/bookings',                      'BookingController@store',        'auth');
Router::get('/bookings/mine',                  'BookingController@mine',         'auth');
Router::delete('/bookings/:id',                'BookingController@cancel',       'auth');
Router::put('/bookings/:id/extend',            'BookingController@extend',       'auth');
Router::post('/bookings/:id/review',           'ReviewController@store',         'auth');

Router::get('/favourites',                     'FavouriteController@index',      'auth');
Router::post('/favourites/:carId',             'FavouriteController@store',      'auth');
Router::delete('/favourites/:carId',           'FavouriteController@destroy',    'auth');

Router::post('/waitlist/:carId',               'WaitlistController@store',       'auth');
Router::delete('/waitlist/:carId',             'WaitlistController@destroy',     'auth');

Router::post('/promos/validate',               'PromoController@validate',       'auth');

// ── Admin only ────────────────────────────────────────────────────────────
Router::post('/cars',                          'CarController@store',            'admin');
Router::put('/cars/:id',                       'CarController@update',           'admin');
Router::delete('/cars/:id',                    'CarController@destroy',          'admin');

Router::get('/bookings',                       'BookingController@index',        'admin');
Router::put('/bookings/:id/confirm',           'BookingController@confirm',      'admin');
Router::put('/bookings/:id/return',            'BookingController@logReturn',    'admin');

Router::get('/admin/stats',                    'AdminController@stats',          'admin');
Router::get('/admin/customers',                'AdminController@customers',      'admin');
Router::get('/admin/customers/:id',            'AdminController@showCustomer',   'admin');
Router::put('/admin/customers/:id/verify',     'AdminController@verify',         'admin');

Router::get('/promos',                         'PromoController@index',          'admin');
Router::post('/promos',                        'PromoController@store',          'admin');
Router::put('/promos/:id',                     'PromoController@update',         'admin');

Router::get('/damage-reports',                 'DamageReportController@index',   'admin');
Router::post('/damage-reports',                'DamageReportController@store',   'admin');
Router::put('/damage-reports/:id/resolve',     'DamageReportController@resolve', 'admin');

Router::post('/upload/image',                  'UploadController@image',         'admin');
