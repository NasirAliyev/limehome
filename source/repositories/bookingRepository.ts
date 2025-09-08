import prisma from '../prisma';

export interface Booking {
    id: number;
    guestName: string;
    unitID: string;
    checkInDate: Date;
    numberOfNights: number;
}

export class BookingRepository {
    async create(booking: {
        guestName: string;
        unitID: string;
        checkInDate: Date;
        numberOfNights: number;
    }): Promise<Booking> {
        return await prisma.booking.create({
            data: {
                guestName: booking.guestName,
                unitID: booking.unitID,
                checkInDate: booking.checkInDate,
                numberOfNights: booking.numberOfNights
            }
        });
    }

    async findById(id: number): Promise<Booking | null> {
        return await prisma.booking.findUnique({
            where: { id }
        });
    }

    async findAll(): Promise<Booking[]> {
        return await prisma.booking.findMany();
    }

    async findByGuestName(guestName: string): Promise<Booking[]> {
        return await prisma.booking.findMany({
            where: { guestName }
        });
    }

    async findByUnitId(unitID: string): Promise<Booking[]> {
        return await prisma.booking.findMany({
            where: { unitID }
        });
    }

    async findByGuestAndUnit(guestName: string, unitID: string): Promise<Booking[]> {
        return await prisma.booking.findMany({
            where: {
                AND: [
                    { guestName },
                    { unitID }
                ]
            }
        });
    }


    async findByUnitIdExcludingBooking(unitID: string, excludeId: number): Promise<Booking[]> {
        return await prisma.booking.findMany({
            where: {
                AND: [
                    { unitID },
                    { id: { not: excludeId } }
                ]
            }
        });
    }

    async findByUnitIdBeforeDate(unitID: string, beforeDate: Date): Promise<Booking[]> {
        return await prisma.booking.findMany({
            where: {
                AND: [
                    { checkInDate: { lt: beforeDate } },
                    { unitID }
                ]
            }
        });
    }

    async updateNumberOfNights(id: number, numberOfNights: number): Promise<Booking> {
        return await prisma.booking.update({
            where: { id },
            data: { numberOfNights }
        });
    }
}
