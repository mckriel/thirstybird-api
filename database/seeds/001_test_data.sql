INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@thirstybird.co.za', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6F0qqmjl2W', 'Admin', 'User', 'admin', true, true),
('550e8400-e29b-41d4-a716-446655440002', 'customer@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6F0qqmjl2W', 'John', 'Customer', 'customer', true, true),
('550e8400-e29b-41d4-a716-446655440003', 'venue@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6F0qqmjl2W', 'Sarah', 'Manager', 'venue', true, true),
('550e8400-e29b-41d4-a716-446655440004', 'customer2@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6F0qqmjl2W', 'Jane', 'Smith', 'customer', true, true);

INSERT INTO venues (id, name, description, address, city, postal_code, latitude, longitude, phone, email, requires_age_verification, is_active) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'The Local Pub', 'Traditional South African pub with great atmosphere', '123 Long Street, Cape Town CBD', 'Cape Town', '8001', -33.9249, 18.4241, '+27216001234', 'info@localpub.co.za', true, true),
('660e8400-e29b-41d4-a716-446655440002', 'Ocean View Restaurant', 'Fine dining with spectacular ocean views', '456 Marine Drive, Sea Point', 'Cape Town', '8005', -33.9057, 18.3773, '+27214391234', 'bookings@oceanview.co.za', false, true),
('660e8400-e29b-41d4-a716-446655440003', 'Mountain Coffee Co', 'Artisan coffee and light meals', '789 Kloof Street, Gardens', 'Cape Town', '8001', -33.9308, 18.4140, '+27214651234', 'hello@mountaincoffee.co.za', false, true);

INSERT INTO venue_profiles (user_id, venue_id, permissions, is_primary_contact) VALUES
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '["manage_deals", "view_analytics", "redeem_vouchers", "manage_venue"]', true),
('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '["manage_deals", "view_analytics", "redeem_vouchers"]', false);

INSERT INTO deals (id, venue_id, title, description, terms_and_conditions, original_price, deal_price, max_vouchers, max_per_customer, start_date, end_date, status, requires_age_verification) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '2-for-1 Craft Beer Special', 'Buy one craft beer and get another one free. Valid for premium craft beers only.', 'Valid Monday to Thursday only. One voucher per table. Must present voucher before ordering. Valid for 30 days from purchase.', 120.00, 60.00, 500, 5, NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days', 'active', true),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '3-Course Dinner for Two', 'Romantic 3-course dinner for two people including wine pairing.', 'Booking essential. Valid Tuesday to Thursday evenings only. Excludes public holidays. Must present voucher upon arrival.', 850.00, 550.00, 100, 2, NOW(), NOW() + INTERVAL '60 days', 'active', false),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 'Coffee & Pastry Combo', 'Any specialty coffee with choice of artisan pastry.', 'Valid weekdays 7AM-11AM only. One voucher per person per day. Cannot be combined with other offers.', 85.00, 50.00, 200, 10, NOW() + INTERVAL '1 day', NOW() + INTERVAL '45 days', 'active', false);

INSERT INTO vouchers (id, user_id, deal_id, venue_id, voucher_code, qr_code_data, status, quantity, purchase_price, expires_at) VALUES
('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'TB-BEER-001234', '{"voucher_id":"880e8400-e29b-41d4-a716-446655440001","deal_id":"770e8400-e29b-41d4-a716-446655440001","venue_id":"660e8400-e29b-41d4-a716-446655440001"}', 'active', 1, 60.00, NOW() + INTERVAL '30 days'),
('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'TB-DINNER-005678', '{"voucher_id":"880e8400-e29b-41d4-a716-446655440002","deal_id":"770e8400-e29b-41d4-a716-446655440002","venue_id":"660e8400-e29b-41d4-a716-446655440002"}', 'active', 1, 550.00, NOW() + INTERVAL '60 days');

INSERT INTO payments (id, user_id, deal_id, venue_id, payment_method, amount, currency, status, external_payment_id, voucher_ids, processed_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'payfast', 60.00, 'ZAR', 'completed', 'pf_test_12345', '{"880e8400-e29b-41d4-a716-446655440001"}', NOW() - INTERVAL '1 hour'),
('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'payfast', 550.00, 'ZAR', 'completed', 'pf_test_67890', '{"880e8400-e29b-41d4-a716-446655440002"}', NOW() - INTERVAL '2 hours');