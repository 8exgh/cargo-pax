'use client';

import {UserButton, useUser} from "@clerk/nextjs";
import {Button} from "antd";
import {Header} from "@/components/header/header";
import {Ref, useEffect, useState} from "react";
import Image from 'next/image';
import _ from "lodash";

interface RefreshRequested {
    priority: number;
}

interface Tracking {
    url: string;
    estimated_delivery_date: string | null;
    label: string;
    refresh_requested: RefreshRequested | null;
    error_message: string | null;
}

interface TrackerMetaData {
    isLabelInEditMode: boolean;
    newLabel: string;
}

interface CompletedDelivery {
    url: string;
    label: string;
    date: string;
}

interface Account {
    id: string;
    tracking: Tracking[];
    completed_deliveries: CompletedDelivery[]
}

export default function Home() {
    const readModelUrl = process.env.NEXT_PUBLIC_READ_MODEL_URL;
    const commandHandlerUrl = process.env.NEXT_PUBLIC_COMMAND_HANDLER_URL;
    const commandHandlerHandleUrl = `${commandHandlerUrl}/handle`;
    const { isLoaded, isSignedIn, user } = useUser();
    const [accountNeedsToBeCreated, setAccountNeedsToBeCreated] = useState(false);
    const [account, setAccount] = useState<Account | null>(null);
    const [errorOccured, setErrorOccured] = useState(false);
    const [currentUrl, setCurrentUrl] = useState('');
    const [refreshAccount, setRefreshAccount] = useState(false);
    const [trackerMetaData, setTrackerMetaData] = useState<Map<string, TrackerMetaData>>(new Map<string, TrackerMetaData>)
    console.log(isLoaded, isSignedIn, user);

    useEffect(() => {
        if(!isLoaded || !isSignedIn) {
            return;
        }

        if(refreshAccount) {
            setRefreshAccount(false);
        }
       const fetchAccount = async () => {
           const response = await fetch(`${readModelUrl}/account/${user?.id}`);

           if(response.ok) {
               console.log("Account exists");
               setAccount(await response.json());
           } else if(response.status === 404) {
               console.log("Account needs to be created");
               setAccountNeedsToBeCreated(true);
           } else {
               console.error(`Error occurred`);
               setErrorOccured(true);
           }
       }

        fetchAccount();

    }, [isLoaded, isSignedIn, refreshAccount]);

    useEffect(() => {
        if(!accountNeedsToBeCreated) {
            return;
        }
        console.log("Creating account");



        const createAccount = async () => {
            const response = await fetch(commandHandlerHandleUrl, {
                method: 'POST',
                body: JSON.stringify({
                    command_name: "create_account_command",
                    userId: user?.id
                })
            });

            if(response.ok) {
                setAccountNeedsToBeCreated(false);
            } else {
                console.error(`Error occurred`);
                setErrorOccured(true);
            }
        }

        createAccount();
    }, [accountNeedsToBeCreated]);

    function startTrackingUrl() {
        const startTrackingUrlAsync = async () => {
            const response = await fetch(commandHandlerHandleUrl, {
                method: 'POST',
                body: JSON.stringify({
                    command_name: "start_tracking_shipment_command",
                    "aggregate_id": user?.id,
                    "url": currentUrl
                })
            });

            if(response.status === 201) {
                setAccountNeedsToBeCreated(false);
                setRefreshAccount(true);
            } else {
                console.error(`Error occurred`);
                setErrorOccured(true);
            }
        }
        setCurrentUrl('');
        startTrackingUrlAsync();
    }



    if(errorOccured) {
        return (<div><Image src='/unrecoverable_error.png' width='300' height='216' alt="Unrecoverable Error"/></div>)
    }

    if(_.isNil(account)) {
        return <div><Header/><div>Account is loading</div></div>
    }

    const notNullAccount = account as Account;

    function startEditingLabel(url: string) {
        const key = url.toLowerCase();
        if(trackerMetaData.has(key)) {
            const trackerInMemoryData = trackerMetaData.get(key) as TrackerMetaData;
            trackerInMemoryData.isLabelInEditMode = true;
            trackerInMemoryData.newLabel = '';
        } else {
            const trackerInMemoryData: TrackerMetaData = { isLabelInEditMode: true, newLabel: '' };
            trackerMetaData.set(key, trackerInMemoryData);
        }

        // Trigger a re-render because a shallow copy will not
        setTrackerMetaData(new Map<string, TrackerMetaData>(trackerMetaData));
    }

    function cancelEditingLabel(url: string) {
        const key = url.toLowerCase();
        if(trackerMetaData.has(key)) {
            const trackerInMemoryData = trackerMetaData.get(key) as TrackerMetaData;
            trackerInMemoryData.isLabelInEditMode = false;
            trackerInMemoryData.newLabel = '';
        } else {
            console.error(`The meta data should exist for tracker url '${url}'`);
            setErrorOccured(true);
        }

        // Trigger a re-render because a shallow copy will not
        setTrackerMetaData(new Map<string, TrackerMetaData>(trackerMetaData));
    }

    function changeLabelValue(url: string, newValue: string) {
        const key = url.toLowerCase();
        if(trackerMetaData.has(key)) {
            const trackerInMemoryData = trackerMetaData.get(key) as TrackerMetaData;
            trackerInMemoryData.newLabel = newValue;
            // Trigger a re-render because a shallow copy will not
            setTrackerMetaData(new Map<string, TrackerMetaData>(trackerMetaData));
        } else {
            console.error(`The meta data should exist for tracker url '${url}'`);
            setErrorOccured(true);
        }
    }



    function saveLabelValue(url: string) {
        const setLabelForTrackerAsync = async (newLabel: string) => {
            const response = await fetch(commandHandlerHandleUrl, {
                method: 'POST',
                body: JSON.stringify({
                    command_name: "update_tracking_shipment_label_command",
                    "aggregate_id": user?.id,
                    "url": url,
                    "label": newLabel
                })
            });

            if(response.status === 201) {
                setRefreshAccount(true);
            } else {
                console.error(`Error occurred`);
                setErrorOccured(true);
            }
        }

        const key = url.toLowerCase();
        if(trackerMetaData.has(key)) {
            const trackerInMemoryData = trackerMetaData.get(key) as TrackerMetaData;
            trackerInMemoryData.isLabelInEditMode = false;
            // Trigger a re-render because a shallow copy will not
            setTrackerMetaData(new Map<string, TrackerMetaData>(trackerMetaData));
            setLabelForTrackerAsync(trackerInMemoryData.newLabel);
        } else {
            console.error(`The meta data should exist for tracker url '${url}'`);
            setErrorOccured(true);
        }
    }

    function refreshAllTrackers() {
        const refreshAllTrackersAsync = async () => {
            const response = await fetch(commandHandlerHandleUrl, {
                method: 'POST',
                body: JSON.stringify({
                    command_name: "refresh_trackers_command",
                    "aggregate_id": user?.id,
                })
            });

            if(response.status === 201) {
                setRefreshAccount(true);
            } else {
                console.error(`Error occurred`);
                setErrorOccured(true);
            }
        }

        refreshAllTrackersAsync();
        setTimeout(() => setRefreshAccount(true), 3000);
        setTimeout(() => setRefreshAccount(true), 6000);
        setTimeout(() => setRefreshAccount(true), 10000);
        setTimeout(() => setRefreshAccount(true), 20000);
        setTimeout(() => setRefreshAccount(true), 30000);
    }

    return (
      <div>
          <Header/>
          <div>Account loaded</div>
          <div style={{ fontFamily: 'Arial, sans-serif', padding: '10px' }}>
              {notNullAccount.tracking.length === 0 ?
                  <span style={{ color: 'red', fontSize: '16px' }}>No urls being tracked</span> :
                  <div>
                      <div>
                      <div style={{ color: 'blue', fontSize: '20px', marginBottom: '10px' }}><span>Urls being tracked</span> <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px' }}>
                            <Button onClick={() => refreshAllTrackers()}>Refresh All</Button>
                                  </span></div>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                          {notNullAccount.tracking.map(t => {
                              const inMemoryData: TrackerMetaData | undefined = trackerMetaData.get(t.url.toLowerCase());
                              const isLabelInEditMode = inMemoryData && inMemoryData.isLabelInEditMode;
                              const newLabel = inMemoryData && inMemoryData.newLabel;

                              return (
                              <li key={t.url} style={{ fontSize: '16px', margin: '5px 0' }}>
                                  <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#007BFF' }}>
                                      {t.url.substring(0, 75)}...
                                  </a>
                                  {
                                      isLabelInEditMode ?
                                          <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px' }}>
                            Description: <input style={{ color: '#333', fontWeight: 'normal' }} value={newLabel} onChange={(e) => changeLabelValue(t.url, e.target.value)} />
                                      <Button onClick={() => saveLabelValue(t.url)}>Save</Button>
                                      <Button onClick={() => cancelEditingLabel(t.url)}>Cancel</Button>
                                  </span>
                                          :
                                  <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px' }}>
                            Description: <span style={{ color: '#333', fontWeight: 'normal' }}>{t.label}</span>
                                      <Button onClick={() => startEditingLabel(t.url)}>Edit</Button>
                                  </span>
                                  }


                                  <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px' }}>
                            Estimated Delivery: <span style={{ color: '#333', fontWeight: 'normal' }}>{t.estimated_delivery_date}</span>
                                  </span>
                                  {
                                      t.error_message &&
                                      <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px', color: "red" }}>
                            Error Updating: <span style={{ color: '#333', fontWeight: 'normal' }}>{t.error_message}</span>
                                  </span>
                                  }

                                  {
                                      t.refresh_requested &&
                                      <span style={{display: 'block', fontWeight: 'bold', marginTop: '4px'}}>
                                          Refresh in Progress...</span>
                                  }
                              </li>
                          )})}
                      </ul>
                  </div>
                  </div>
              }
              {
                  notNullAccount.completed_deliveries.length > 0 &&
                  <div>
                      <div style={{ color: 'blue', fontSize: '20px', marginBottom: '10px' }}><span>Packages That Were Delivered</span> <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px' }}>

                                  </span></div>
                      <ul style={{ listStyleType: 'disc', paddingLeft: '20px' }}>
                          {notNullAccount.completed_deliveries.map(t => {

                              return (
                                  <li key={t.url} style={{ fontSize: '16px', margin: '5px 0' }}>
                                      <a href={t.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#007BFF' }}>
                                          {t.url.substring(0, 75)}...
                                      </a>
                                      <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px' }}>
                            Description: <span style={{ color: '#333', fontWeight: 'normal' }}>{t.label}</span>
                                  </span>



                                      <span style={{ display: 'block', fontWeight: 'bold', marginTop: '4px' }}>
                            Delivered On: <span style={{ color: '#333', fontWeight: 'normal' }}>{t.date}</span>
                                  </span>

                                  </li>
                              )})}
                      </ul>
                  </div>

              }
          </div>
          {/*<div>*/}
          {/*    {notNullAccount.tracking.length === 0 ? <span>No urls being tracked</span>:*/}
          {/*        <div>*/}
          {/*            <div>Urls being tracked</div>*/}
          {/*          <ul>*/}
          {/*              {notNullAccount.tracking.map(t => (<li key={t.url}>{t.url}</li>))}*/}
          {/*          </ul>*/}
          {/*        </div>*/}
          {/*    }*/}
          {/*</div>*/}
          <div>
              <input type="text"
                     value={currentUrl}
                     onChange={e => setCurrentUrl(e.target.value)}
                     placeholder={"Enter a url"}/>
              <button onClick={startTrackingUrl}>Track url</button>
          </div>
          <div style={({border: "1px solid solid", width: "100px", height: "50px"})}><UserButton  afterSignOutUrl="/"/></div>
      </div>
  )
}