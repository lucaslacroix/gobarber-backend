import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import Appointment from '../models/Appointment';

import Notification from '../schemas/Notification';
import Cache from '../../lib/Cache';

class CreateAppointmentService {
    async run({ provider_id, user_id, date }) {
        /**
         * Checar se um prestador de serviços
         * não está marcando hora com ele mesmo
         */
        if (provider_id === user_id) {
            throw new Error('Você não pode marcar horário com você mesmo');
        }

        /**
         * Checar se o provider_id é de um provider
         */
        const isProvider = await User.findOne({
            where: { id: provider_id, provider: true },
        });

        if (!isProvider) {
            throw new Error('You can only create appointments with providers');
        }

        /**
         * Checar se a data solicitada não é passada
         */
        const hourStart = startOfHour(parseISO(date));

        if (isBefore(hourStart, new Date())) {
            throw new Error('Past dates are not permitted');
        }

        /**
         * Checar se a data solicitada está livre
         */
        const checkAvailability = await Appointment.findOne({
            where: {
                provider_id,
                canceled_at: null,
                date: hourStart,
            },
        });

        if (checkAvailability) {
            throw new Error('Appointment date is not available');
        }

        const appointment = await Appointment.create({
            user_id,
            provider_id,
            date,
        });

        /**
         * Notificar prestador de serviço
         */
        const user = await User.findByPk(user_id);
        const formatedDate = format(
            hourStart,
            "'dia' dd 'de' MMMM', às' H:mm'h'",
            { locale: pt }
        );
        await Notification.create({
            content: `Novo agendamento de ${user.name} para ${formatedDate}`,
            user: provider_id,
        });

        /**
         * Invalidar cache
         */
        await Cache.invalidatePrefix(`user:${user_id}:appointments`);

        return appointment;
    }
}

export default new CreateAppointmentService();
