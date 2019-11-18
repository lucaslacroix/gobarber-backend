import { isBefore, subHours } from 'date-fns';

import Appointment from '../models/Appointment';
import User from '../models/User';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';
import Cache from '../../lib/Cache';

class CancelAppointmentService {
    async run({ provider_id, user_id }) {
        const appointment = await Appointment.findByPk(provider_id, {
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['name', 'email'],
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['name'],
                },
            ],
        });

        if (appointment.user_id !== user_id) {
            throw new Error('Você não possui esse agendamento');
        }

        const dateWithSub = subHours(appointment.date, 2);

        if (isBefore(dateWithSub, new Date())) {
            throw new Error(
                'Você não pode cancelar com menos de 2 horas antes do horário agendado'
            );
        }

        appointment.canceled_at = new Date();

        await appointment.save();

        await Queue.add(CancellationMail.key, {
            appointment,
        });

        /**
         * Invalidar cache
         */
        await Cache.invalidatePrefix(`user:${user_id}:appointments`);

        return appointment;
    }
}

export default new CancelAppointmentService();
