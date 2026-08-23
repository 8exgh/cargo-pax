use std::{env, io};
use std::str::FromStr;
use actix_cors::Cors;
use actix_web::{HttpServer, web};
use actix_web::App;
use actix_web::middleware::Logger;
use bb8_postgres::bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;
use url::form_urlencoded;
use crate::hello::get;


mod hello;
mod handle_command_endpoint;
mod commands;
mod command_handlers;
mod events;
mod aggregate_roots;
mod repositories;

struct MyData {
    pool: Pool<PostgresConnectionManager<NoTls>>
}

fn get_env_variable_or_exit_process(key: &str) -> String {
    let value = match env::var(key.clone()) {
        Ok(value) => value,
        Err(_) => {
            println!("Available environment variables are");
            for (key, value) in env::vars() {
                println!("{}",key);
            }
            eprintln!("Could not find environment variable {}",key.clone());
            std::process::exit(1);
        }
    };

    return value;
}


#[actix_rt::main]
async fn main() -> io::Result<()> {
    env::set_var("RUST_LOG", "actix_web=debug,actix_server=info");
    env_logger::init();


    let db_user_name = get_env_variable_or_exit_process("EVENTS_DATABASE_USER_NAME");
    let db_host_name =get_env_variable_or_exit_process("EVENTS_DATABASE_HOST_NAME");
    let db_name = get_env_variable_or_exit_process("EVENTS_DATABASE_NAME");
    let db_password = get_env_variable_or_exit_process("EVENTS_DATABASE_PASSWORD");
    let db_port = get_env_variable_or_exit_process("EVENTS_DATABASE_PORT");

    let db_escaped_password: String = form_urlencoded::byte_serialize(db_password.as_bytes()).collect();

    let connection_string = format!("postgres://{db_user_name}:{db_escaped_password}@{db_host_name}:{db_port}/{db_name}");

    let config = tokio_postgres::config::Config::from_str(
        connection_string.as_ref()
    )
        .unwrap();

    let pg_mgr = PostgresConnectionManager::new(config, tokio_postgres::NoTls);

    let pool = match Pool::builder().build(pg_mgr).await {
        Ok(pool) => pool,
        Err(e) => panic!("builder error: {e:?}"),
    };


    HttpServer::new(move || {
        let cors = Cors::permissive();
        App::new()
            .wrap(cors)
            // enable logger - always register actix-web Logger middleware last
            .wrap(Logger::default())

            .app_data(web::Data::new(MyData { pool: pool.clone() }))
            // register HTTP requests handlers
            .service(hello::get)
            .service(handle_command_endpoint::handle_command_endpoint)

    })
        .bind("0.0.0.0:9090")?
        .run()
        .await
}
