import axios, { AxiosError, HttpStatusCode } from 'axios';
import { startServer, stopServer } from '../source/server';
import { PrismaClient } from '@prisma/client';

const GUEST_A_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_A_UNIT_2 = {
    unitID: '2',
    guestName: 'GuestA',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const GUEST_B_UNIT_1 = {
    unitID: '1',
    guestName: 'GuestB',
    checkInDate: new Date().toISOString().split('T')[0],
    numberOfNights: 5,
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const API_BOOKING_URL = 'http://localhost:8000/api/v1/booking';
const API_BOOKING_EXTEND_URL = 'http://localhost:8000/api/v1/booking';

const prisma = new PrismaClient();

beforeEach(async () => {
    // Clear any test setup or state before each test
    await prisma.booking.deleteMany();
});

beforeAll(async () => {
    await startServer();
});

afterAll(async () => {
    await prisma.$disconnect();
    await stopServer();
});

describe('Booking API', () => {
    test('Create fresh booking', async () => {
        const response = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);

        expect(response.status).toBe(HttpStatusCode.Ok);
        expect(response.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response.data.unitID).toBe(GUEST_A_UNIT_1.unitID);
        expect(response.data.numberOfNights).toBe(GUEST_A_UNIT_1.numberOfNights);
    });

    test('Same guest same unit booking', async () => {
        // Create first booking
        const response1 = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
        expect(response1.status).toBe(HttpStatusCode.Ok);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // Guests want to book the same unit again
        let error: any;
        try {
            await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(HttpStatusCode.BadRequest);
        expect(error.response.data).toEqual('The given guest name cannot book the same unit multiple times');
    });

    test('Same guest different unit booking', async () => {
        // Create first booking
        const response1 = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
        expect(response1.status).toBe(200);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // Guest wants to book another unit
        let error: any;
        try {
            await axios.post(API_BOOKING_URL, GUEST_A_UNIT_2);
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(HttpStatusCode.BadRequest);
        expect(error.response.data).toEqual('The same guest cannot be in multiple units at the same time');
    });

    test('Different guest same unit booking', async () => {
        // Create first booking
        const response1 = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
        expect(response1.status).toBe(HttpStatusCode.Ok);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
        expect(response1.data.unitID).toBe(GUEST_A_UNIT_1.unitID);

        // GuestB trying to book a unit that is already occupied
        let error: any;
        try {
            await axios.post(API_BOOKING_URL, GUEST_B_UNIT_1);
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(HttpStatusCode.Conflict);
        expect(error.response.data).toEqual('For the given check-in date, the unit is already occupied');
    });

    test('Different guest same unit booking different date', async () => {
        // Create first booking
        const response1 = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
        expect(response1.status).toBe(200);
        expect(response1.data.guestName).toBe(GUEST_A_UNIT_1.guestName);

        // GuestB trying to book a unit that is already occupied
        let error: any;
        try {
            await axios.post(API_BOOKING_URL, {
                unitID: GUEST_B_UNIT_1.unitID,
                guestName: GUEST_B_UNIT_1.guestName,
                checkInDate: new Date(new Date().getTime() + DAY_IN_MILLISECONDS * 1).toISOString().split('T')[0],
                numberOfNights: 5
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(HttpStatusCode.Conflict);
        expect(error.response.data).toBe('For the given check-in date, the unit is already occupied');
    });

    test('Same-day checkout and check-in should be allowed', async () => {
        const response1 = await axios.post(API_BOOKING_URL, {
            unitID: GUEST_A_UNIT_1.unitID,
            guestName: GUEST_A_UNIT_1.guestName,
            checkInDate: new Date().toISOString().split('T')[0],
            numberOfNights: 3
        });
        expect(response1.status).toBe(HttpStatusCode.Ok);

        const response2 = await axios.post(API_BOOKING_URL, {
            unitID: GUEST_B_UNIT_1.unitID,
            guestName: GUEST_B_UNIT_1.guestName,
            checkInDate: new Date(new Date().getTime() + DAY_IN_MILLISECONDS * 3).toISOString().split('T')[0],
            numberOfNights: 2
        });

        expect(response2.status).toBe(HttpStatusCode.Ok);
        expect(response2.data.guestName).toBe(GUEST_B_UNIT_1.guestName);
    });

    test('Partial overlap should be rejected', async () => {
        const response1 = await axios.post(API_BOOKING_URL, {
            unitID: GUEST_A_UNIT_1.unitID,
            guestName: GUEST_A_UNIT_1.guestName,
            checkInDate: new Date().toISOString().split('T')[0],
            numberOfNights: 5
        });
        expect(response1.status).toBe(HttpStatusCode.Ok);

        let error: any;
        try {
            await axios.post(API_BOOKING_URL, {
                unitID: GUEST_B_UNIT_1.unitID,
                guestName: GUEST_B_UNIT_1.guestName,
                checkInDate: new Date(new Date().getTime() + DAY_IN_MILLISECONDS * 2).toISOString().split('T')[0],
                numberOfNights: 4
            });
        } catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(AxiosError);
        expect(error.response.status).toBe(HttpStatusCode.Conflict);
        expect(error.response.data).toBe('For the given check-in date, the unit is already occupied');
    });

    test('Boundary test: Booking exactly when another ends should be allowed', async () => {
        const response1 = await axios.post(API_BOOKING_URL, {
            unitID: GUEST_A_UNIT_1.unitID,
            guestName: GUEST_A_UNIT_1.guestName,
            checkInDate: new Date().toISOString().split('T')[0],
            numberOfNights: 2
        });
        expect(response1.status).toBe(HttpStatusCode.Ok);

        const response2 = await axios.post(API_BOOKING_URL, {
            unitID: GUEST_B_UNIT_1.unitID,
            guestName: GUEST_B_UNIT_1.guestName,
            checkInDate: new Date(new Date().getTime() + DAY_IN_MILLISECONDS * 2).toISOString().split('T')[0],
            numberOfNights: 3
        });

        expect(response2.status).toBe(HttpStatusCode.Ok);
        expect(response2.data.guestName).toBe(GUEST_B_UNIT_1.guestName);
    });

    describe('Extend Booking API', () => {
        test('Successfully extend a booking', async () => {
            // Create initial booking
            const response1 = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
            expect(response1.status).toBe(HttpStatusCode.Ok);
            expect(response1.data.numberOfNights).toBe(5);

            const bookingId = response1.data.id;

            // Extend the booking by 3 additional nights
            const extendRequest = {
                additionalNights: 3
            };

            const response2 = await axios.patch(`${API_BOOKING_EXTEND_URL}/${bookingId}`, extendRequest);
            expect(response2.status).toBe(HttpStatusCode.Ok);
            expect(response2.data.numberOfNights).toBe(8); // 5 + 3
            expect(response2.data.guestName).toBe(GUEST_A_UNIT_1.guestName);
            expect(response2.data.unitID).toBe(GUEST_A_UNIT_1.unitID);
        });

        test('Extend booking with zero additional nights should be rejected', async () => {
            // Create initial booking
            const response1 = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
            expect(response1.status).toBe(HttpStatusCode.Ok);

            const bookingId = response1.data.id;

            // Try to extend with 0 additional nights
            let error: any;
            try {
                await axios.patch(`${API_BOOKING_EXTEND_URL}/${bookingId}`, {
                    additionalNights: 0
                });
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(HttpStatusCode.BadRequest);
            expect(error.response.data).toBe('Additional nights must be greater than 0');
        });

        test('Extend booking with negative additional nights should be rejected', async () => {
            // Create initial booking
            const response1 = await axios.post(API_BOOKING_URL, GUEST_A_UNIT_1);
            expect(response1.status).toBe(HttpStatusCode.Ok);

            const bookingId = response1.data.id;

            // Try to extend with negative additional nights
            let error: any;
            try {
                await axios.patch(`${API_BOOKING_EXTEND_URL}/${bookingId}`, {
                    additionalNights: -2
                });
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(HttpStatusCode.BadRequest);
            expect(error.response.data).toBe('Additional nights must be greater than 0');
        });

        test('Extend booking for non-existent booking should be rejected', async () => {
            // Try to extend a booking that doesn't exist
            let error: any;
            try {
                await axios.patch(`${API_BOOKING_EXTEND_URL}/999`, {
                    additionalNights: 3
                });
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(HttpStatusCode.NotFound);
            expect(error.response.data).toBe('Booking not found');
        });

        test('Extend booking that conflicts with existing booking should be rejected', async () => {
            // Create first booking for 3 nights starting today
            const response1 = await axios.post(API_BOOKING_URL, {
                unitID: GUEST_A_UNIT_1.unitID,
                guestName: GUEST_A_UNIT_1.guestName,
                checkInDate: new Date().toISOString().split('T')[0],
                numberOfNights: 3
            });
            expect(response1.status).toBe(HttpStatusCode.Ok);

            const bookingId = response1.data.id;

            // Create second booking that starts after first booking ends
            const response2 = await axios.post(API_BOOKING_URL, {
                unitID: GUEST_A_UNIT_1.unitID,
                guestName: GUEST_B_UNIT_1.guestName,
                checkInDate: new Date(new Date().getTime() + DAY_IN_MILLISECONDS * 3).toISOString().split('T')[0],
                numberOfNights: 2
            });
            expect(response2.status).toBe(HttpStatusCode.Ok);

            // Try to extend first booking to conflict with second booking
            let error: any;
            try {
                await axios.patch(`${API_BOOKING_EXTEND_URL}/${bookingId}`, {
                    additionalNights: 2 // This would extend into the second booking
                });
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(HttpStatusCode.Conflict);
            expect(error.response.data).toBe('Extension conflicts with existing booking');
        });

        test('Extend booking that does not conflict should be allowed', async () => {
            // Create first booking for 3 nights starting today
            const response1 = await axios.post(API_BOOKING_URL, {
                unitID: GUEST_A_UNIT_1.unitID,
                guestName: GUEST_A_UNIT_1.guestName,
                checkInDate: new Date().toISOString().split('T')[0],
                numberOfNights: 3
            });
            expect(response1.status).toBe(HttpStatusCode.Ok);

            const bookingId = response1.data.id;

            // Create second booking that starts well after first booking ends
            const response2 = await axios.post(API_BOOKING_URL, {
                unitID: GUEST_A_UNIT_1.unitID,
                guestName: GUEST_B_UNIT_1.guestName,
                checkInDate: new Date(new Date().getTime() + DAY_IN_MILLISECONDS * 5).toISOString().split('T')[0],
                numberOfNights: 2
            });
            expect(response2.status).toBe(HttpStatusCode.Ok);

            // Extend first booking by 1 night (should not conflict)
            const response3 = await axios.patch(`${API_BOOKING_EXTEND_URL}/${bookingId}`, {
                additionalNights: 1
            });

            expect(response3.status).toBe(HttpStatusCode.Ok);
            expect(response3.data.numberOfNights).toBe(4); // 3 + 1
        });

        test('Multiple extensions should work correctly', async () => {
            // Create initial booking
            const response1 = await axios.post(API_BOOKING_URL, {
                unitID: GUEST_A_UNIT_1.unitID,
                guestName: GUEST_A_UNIT_1.guestName,
                checkInDate: new Date().toISOString().split('T')[0],
                numberOfNights: 2
            });
            expect(response1.status).toBe(HttpStatusCode.Ok);

            const bookingId = response1.data.id;

            // First extension
            const response2 = await axios.patch(`${API_BOOKING_EXTEND_URL}/${bookingId}`, {
                additionalNights: 2
            });
            expect(response2.status).toBe(HttpStatusCode.Ok);
            expect(response2.data.numberOfNights).toBe(4);

            // Second extension
            const response3 = await axios.patch(`${API_BOOKING_EXTEND_URL}/${bookingId}`, {
                additionalNights: 1
            });
            expect(response3.status).toBe(HttpStatusCode.Ok);
            expect(response3.data.numberOfNights).toBe(5);
        });

        test('Invalid booking ID should be rejected', async () => {
            // Try to extend with invalid booking ID
            let error: any;
            try {
                await axios.patch(`${API_BOOKING_EXTEND_URL}/invalid`, {
                    additionalNights: 3
                });
            } catch (e) {
                error = e;
            }

            expect(error).toBeInstanceOf(AxiosError);
            expect(error.response.status).toBe(HttpStatusCode.BadRequest);
            expect(error.response.data).toBe('Invalid booking ID');
        });
    });
});
