import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@reach/tabs";
import draftToHtml from "draftjs-to-html";
import dayjs from "dayjs";
import useSWR from "swr";
import styled from "styled-components";
import advancedFormat from "dayjs/plugin/advancedFormat";
import CompetitionPhases from "../features/competitions/CompetitionPhases";
import { amIParticipantInEntryList, findRegisterAction, hasPreRegistration, hasVote } from "../utils/competitions";
import type { ICompetition, IEntry, IEntryListResponse } from "../features/competitions/competition";
import { formatNumber } from "../utils/numbers";
import { useUserState } from "../context/Auth";
import { httpGet } from "../utils/fetcher";
import { hasPermission, Permission } from "../utils/permissions";
import "./CompetitionDetails.scss";
import "@reach/tabs/styles.css";

dayjs.extend(advancedFormat);

const convertDraftToHtml = (data: any) => {
    let html = data;

    try {
        html = draftToHtml(JSON.parse(data));
    } catch (_) {
        return html;
    }

    return html;
};

const HeadingWrapper = styled.h1`
    background: linear-gradient(5deg, #00000088 30%, #ffffff22 100%);
`;

const Content = ({
    competition,
    hasEntry,
    isAuthenticated,
    to,
}: {
    competition: ICompetition;
    hasEntry: IEntry | boolean;
    isAuthenticated: boolean;
    to: string;
}) => {
    const action = findRegisterAction(competition, hasEntry, isAuthenticated);
    const loginUrl = useMemo(() => {
        const url = new URL(import.meta.env.VITE_APP_API + "/oauth/authorize/");
        url.searchParams.append("client_id", import.meta.env.VITE_APP_CLIENT_ID as string);
        url.searchParams.append("response_type", "code");
        url.searchParams.append("redirect_uri", window.location.origin + "/login");

        return url.toString();
    }, []);

    switch (action) {
        case "login":
            return (
                <div className="text-right">
                    <a
                        href={loginUrl}
                        className="px-1 text-indigo-700 dark:text-indigo-300 underline transition-all duration-150 rounded-sm hover:text-indigo-900 hover:bg-indigo-200 dark:hover:text-indigo-100 dark:hover:bg-indigo-700"
                    >
                        Log in to register
                    </a>
                </div>
            );

        case "register":
            return (
                <Link
                    to={to + "/register"}
                    className="flex items-center h-12 px-4 mb-6 text-base font-semibold text-green-800 duration-150 bg-green-300 rounded justify-evenly hover:bg-green-700 hover:text-black hover:shadow"
                >
                    Register now!
                </Link>
            );

        case "my_registration":
            return (
                <Link
                    to={to + "/register/"}
                    className="flex items-center h-12 px-4 mb-6 text-base font-semibold text-green-800 duration-150 bg-green-300 rounded justify-evenly hover:bg-green-700 hover:text-black hover:shadow"
                >
                    Check out your registration
                </Link>
            );

        case "result":
            return null;

        // case 'external':
        //     return (
        //         <Segment basic>
        //             <Header as="a" href={competition.external_url_info} color="orange">
        //                 This is an externally hosted competition, click here for more information!
        //             </Header>
        //             <br />
        //             <Header size="small" as="a" href={competition.external_url_login} color="grey">
        //                 Direct to login
        //             </Header>
        //         </Segment>
        //     );

        default:
            return null;
    }
};

const CompetitionDetails = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useUserState();
    const { data } = useSWR<ICompetition>("competitions/competitions/" + id, httpGet);

    const competitionDescription = useMemo(() => convertDraftToHtml(data?.description), [data]);
    const competitionRules = useMemo(() => convertDraftToHtml(data?.rules), [data]);

    const {
        data: entries,
        mutate: refetchEntries,
        isValidating: isValidatingEntries,
    } = useSWR<IEntryListResponse>(`competitions/entries/?competition_id=${id}&limit=1000`, httpGet, {
        revalidateOnFocus: false,
    });

    const hasEntry = useMemo(() => (entries ? amIParticipantInEntryList(entries.results) : false), [entries]);
    const hasMeta = useMemo(() => !!data?.prizes.length || !!data?.links.length || data?.sponsor_name, [data]);

    if (!data) {
        // TODO Return loading component
        return null;
    }

    return (
        <div className="container mx-auto my-12 sm:my-0">
            <div className="relative mb-10 sm:mb-6">
                <img className="object-cover w-full h-48 rounded-md sm:rounded-none" src={data.header_image} alt="" />
                <HeadingWrapper className="absolute bottom-0 flex items-end w-full h-full px-4 pb-3 text-5xl rounded-md sm:rounded-none text-gray-50">
                    {data.name}
                </HeadingWrapper>
                <p className="absolute bottom-0 sm:top-0 right-0 py-2 px-4 text-gray-200 text-sm">
                    Image by: {data.header_credit}
                </p>
            </div>
            <div className="flex flex-horizontal sm:flex-col-reverse">
                <div className="flex-grow">
                    {data.state.value === 32 && (
                        <section
                            className="container w-full col-span-2 px-3 py-5 mx-auto mt-4 mb-6 text-green-700 bg-green-100 border-l-4 border-green-500 "
                            role="alert"
                        >
                            <p>
                                <strong>Voting is open! </strong>{" "}
                                {!!user ? "Cast your votes now!" : "Please log in to cast your votes!"}
                            </p>
                        </section>
                    )}
                    <CompetitionPhases competition={data} />
                    <Tabs className="bg-white dark:bg-gray-800 rounded sm:rounded-none">
                        <TabList className="flex">
                            {competitionDescription && (
                                <Tab className="flex-grow py-3 border-b border-tg-brand-orange-500">Information</Tab>
                            )}
                            <Tab className="flex-grow py-3 border-b">Rules</Tab>
                        </TabList>
                        <TabPanels className="p-4">
                            {competitionDescription && (
                                <TabPanel>
                                    <div dangerouslySetInnerHTML={{ __html: competitionDescription }} />
                                </TabPanel>
                            )}
                            <TabPanel>
                                <div dangerouslySetInnerHTML={{ __html: competitionRules }} />
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </div>
                <aside style={{ minWidth: "20rem" }} className="mt-4 ml-10 sm:my-0 sm:mx-2">
                    {!!user && data.state.value === 32 && (
                        <Link
                            to={`/competitions/${id}/vote`}
                            className="flex items-center justify-center py-4 mb-0 text-xl text-white transition-all duration-150 rounded-lg px-7 hover:scale-105 bg-tg-brand-orange-500 hover:bg-tg-brand-orange-600 hover:font-semibold"
                        >
                            Vote!
                            <span className="pl-2">🎉</span>
                        </Link>
                    )}

                    <Content
                        competition={data}
                        isAuthenticated={!!user}
                        to={`/competitions/${id}`}
                        hasEntry={hasEntry}
                    />

                    {hasPermission(Permission.CompetitionsChangeCompetition, data.permissions) && (
                        <Link
                            to={`/admin/competitions/${id}/edit`}
                            className="flex items-center h-12 px-4 mt-10 sm:mt-6 mb-10 sm:mb-6 text-base font-semibold text-yellow-800 duration-150 bg-yellow-300 rounded justify-evenly hover:bg-yellow-700 hover:text-black hover:shadow"
                        >
                            Edit
                        </Link>
                    )}

                    {hasMeta && (
                        <section className="p-4 bg-white dark:bg-gray-800 rounded sm:rounded-none">
                            {!!data.prizes.length && (
                                <>
                                    <h2 className="pb-2 text-lg">Prizes</h2>
                                    <ul className="w-2/3 mt-2 leading-8 pb-4">
                                        {data.prizes.map((prize: String, i: number) => (
                                            <li
                                                key={prize + i.toString()}
                                                className="pr-3 font-light text-gray-600 dark:text-gray-200"
                                            >
                                                {formatNumber(i + 1)} <span className="float-right">{prize}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}

                            {!!data.sponsor_name && (
                                <>
                                    <h2 className="pb-2 text-lg">Powered By</h2>
                                    <div className="w-64 mt-2 mx-auto pb-4 dark:bg-gray-100">
                                        <img src={data.sponsor_logo} alt={data.sponsor_name} className="p-2" />
                                    </div>
                                </>
                            )}

                            {!!data.links.length && (
                                <>
                                    <h2 className="pb-2 text-lg">Links</h2>
                                    <ul className="w-2/3 mt-2 leading-8">
                                        {data.links.map((link: any) => (
                                            <li>
                                                <a
                                                    href={link.href}
                                                    target="_blank"
                                                    className="px-1 py-1 text-indigo-700 underline capitalize transition-all duration-150 rounded-sm hover:text-indigo-900 hover:bg-indigo-200 hover:px-2"
                                                    rel="noreferrer noopener"
                                                >
                                                    {link.destination}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </section>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default CompetitionDetails;
