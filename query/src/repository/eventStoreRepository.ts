import _ from "lodash";
import {Pool} from "pg";

let instance: EventStoreRepository = null;

export type EventDbRow = {
    event_id: string,
    event_order: number,
    aggregate_type: string,
    aggregate_id: string,
    event_type: string,
    aggregate_version: string
    timestamp: any, // It is some sort of postgres object from pg library
    event_object: string
}
export class EventStoreRepository {
    private pool: Pool;
    private getPool(): Pool {
        if(_.isNil(this.pool)) {
            throw Error("Connect to database first");
        }
        return this.pool;
    }

    private getEnvironmentVariableOrExitProcess(key: string): string {
        const value = process.env[key];
        if(_.isNil(value)) {
            console.log("Available environment variables:");
            Object.keys(process.env).forEach(console.log);
            console.error(`Could not find environment variable '${key}'. Exiting process.`)
            process.exit(1);
        }
        return value;
    }
    async getAllEventsAfterEventOrder(eventOrder: number):Promise<EventDbRow[]> {
        const sqlQuery = `SELECT * FROM events where event_order > ${eventOrder} order by event_order asc`;
        const events = await this.getPool().query(sqlQuery);

        const dbRows = events.rows.map(({event_id,
                             event_order,
                             aggregate_type,
                             aggregate_id,
                             event_type,
                             aggregate_version,
                             timestamp,
                             event_object}) => {
            const dbRow: EventDbRow = {event_id,
                event_order,
                aggregate_type,
                aggregate_id,
                event_type,
                aggregate_version,
                timestamp,
                event_object};

            return dbRow;
        })

        return dbRows;
    }

    connect(): void {
        if(!_.isNil(this.pool)) {
            throw new Error("Event store is already connected");
        }

        const events_database_user_name = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_USER_NAME');
        const events_database_host_name = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_HOST_NAME');
        const events_database_name = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_NAME');
        const events_database_password = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_PASSWORD');
        const events_database_port = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_PORT');



        this.pool = new Pool({
            user: events_database_user_name,
            host: events_database_host_name,
            database: events_database_name,
            password: events_database_password,
            port: Number(events_database_port)
        });
        this.pool.connect((err) => {
            if(err) {
                console.error("Error connecting to Event Store", err);
                throw err;
            } else {
                console.log("Connected to Event Store");
            }
        });
    }

    static getInstance(): EventStoreRepository {
        if(_.isNil(instance)) {
           instance = new EventStoreRepository();
           instance.connect();
        }
        return instance;
    }
}